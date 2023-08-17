sap.ui.define(["sap/ui/base/Object","sap/m/MessageBox","sap/ui/model/Filter","sap/ui/model/FilterOperator"],function(e,t,s,r){"use strict";return e.extend("convergent.report.msazurereports.controller.ErrorHandler",{constructor:function(e){var t=sap.ui.getCore().getMessageManager(),n=t.getMessageModel(),o=e.getModel("i18n").getResourceBundle(),i=o.getText("errorText"),a=o.getText("multipleErrorsText");this._oComponent=e;this._bMessageOpen=false;this.oMessageModelBinding=n.bindList("/",undefined,[],new s("technical",r.EQ,true));this.oMessageModelBinding.attachChange(function(e){var s=e.getSource().getContexts(),r=[],n;if(this._bMessageOpen||!s.length){return}s.forEach(function(e){r.push(e.getObject())});t.removeMessages(r);n=r.length===1?i:a;this._showServiceError(n,r[0].message)},this)},_showServiceError:function(e,s){this._bMessageOpen=true;t.error(e,{id:"serviceErrorMessageBox",details:s,styleClass:this._oComponent.getContentDensityClass(),actions:[t.Action.CLOSE],onClose:function(){this._bMessageOpen=false}.bind(this)})}})});
//# sourceMappingURL=ErrorHandler.js.map