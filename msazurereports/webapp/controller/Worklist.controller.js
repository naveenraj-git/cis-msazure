sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("convergent.report.msazurereports.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");

           
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
            
        },
        onAfterRendering: function()
        {
            this.loadWorkItems();
        },
        loadWorkItems : function()
        {

            // var oListBinding = oModel.bindList("/WorkItems",undefined,undefined,undefined,{
			// 	$select: ["WorkItemId","WorkItemType","Title","State","CISPlanning_EstimatedHours","Effort","RemainingWork","DueDate","AssignedTo/UserName","AssignedTo/UserId"]
			// });
            var thisReference = this;
            var oModel = this.getView().getModel();
            var workItemModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(workItemModel,"workItemModel");

            var oList = oModel.bindList("/WorkItems",undefined,undefined,undefined,{
                	$select: ["WorkItemId","WorkItemType","Title","State",
                    "CISPlanning_EstimatedHours","Effort","RemainingWork","DueDate",
                    "AssignedTo/UserName","AssignedTo/UserId","Area/AreaId","Area/AreaPath",
                    "Iteration/IterationId","Iteration/IterationPath","Iteration/Number"],
                   // $apply : 'groupby((AssignedTo/UserName), aggregate($count as EffortCount))',
                 });

            oList.requestContexts(0,1000).then(function (aContexts) {                
                var oData = {WorkItems: aContexts.map(oContext => oContext.getObject())};               
                workItemModel.setData(oData);      
                //var copyWorkItems = $.extend({},oData);     
                var copyWorkItems = JSON.parse(JSON.stringify(oData));
                thisReference.convertToFlatData(copyWorkItems);
            });
        },
        convertToFlatData : function (copyWorkItems)
        {            
            var flatWorkItemData = [];
            var newElement = {};
            copyWorkItems.WorkItems.forEach(element => {
                newElement = element;
                
                if(element.Area!=null)
                {
                newElement.AreaId = element.Area.AreaId;
                newElement.AreaPath = element.Area.AreaPath; 
                }
                if(element.Iteration!=null)
                {
                newElement.IterationId = element.Iteration.IterationId;
                newElement.IterationPath = element.Iteration.IterationPath;
                newElement.IterationNumber = element.Iteration.Number;
                } 
               
                delete newElement.Area;
                delete newElement.Iteration;

                if(element.AssignedTo!=null)
                {
                newElement.UserName = element.AssignedTo.UserName;
                newElement.UserId = element.AssignedTo.UserId; 
                delete newElement.AssignedTo;
                flatWorkItemData.push(newElement);
                }  

                
            });
            console.log("flatWorkItemData",flatWorkItemData);

            this.workItemsGroupByUser(flatWorkItemData);
        },
        workItemsGroupByUser: function(flatWorkItemData)
        { 
            const resultArr = [];

            // grouping by location and resulting with an object using Array.reduce() method
            const groupByUser= flatWorkItemData.reduce((group, item) => {
            const { UserId } = item;
            group[UserId] = group[UserId] ?? [];
            group[UserId].push(item);
            return group;
            }, {});

            // Finally calculating the sum based on the location array we have.
            Object.keys(groupByUser).forEach((item) => {
                groupByUser[item] = groupByUser[item].reduce((a, b) => a + b);
                resultArr.push({
                    'items': item,
                    'count': groupByUser[item]
                })
            })

            console.log("resultArr",resultArr);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress : function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack : function() {
            // eslint-disable-next-line fiori-custom/sap-no-history-manipulation, fiori-custom/sap-browser-api-warning
            history.go(-1);
        },


        onSearch : function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("WorkItemId", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh : function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject : function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getPath().substring("/WorkItems".length)
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function(aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        }

    });
});
