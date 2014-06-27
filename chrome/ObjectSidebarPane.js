WebInspector.ObjectSidebarPane = function(name, emptyPlaceholder, editCallback) {
    this._emptyPlaceholder = emptyPlaceholder;
    this._editCallback = editCallback;
    WebInspector.SidebarPane.call(this, name);
};

WebInspector.ObjectSidebarPane.prototype = {

    update: function(object) {
        var body = this.bodyElement;
        body.removeChildren();

        if (!object) {
            return;
        }

        var section = new WebInspector.ObjectPropertiesSection(object, '', '', this._emptyPlaceholder, false, null,
                                                               WebInspector.EditableObjectPropertyTreeElement.bind(null, this.onedit.bind(this)));
        section.expanded = true;
        section.editable = true;
        section.headerElement.addStyleClass("hidden");
        body.appendChild(section.element);
    },

    onedit: function(omg) {
        if (this._editCallback) this._editCallback(omg);
    },

    __proto__: WebInspector.SidebarPane.prototype

};

WebInspector.EditableObjectPropertyTreeElement = function(editCallback, property) {
    this._editCallback = editCallback;
    WebInspector.ObjectPropertyTreeElement.call(this, property);
};

WebInspector.EditableObjectPropertyTreeElement.prototype = {

    applyExpression: function(expression, updateInterface) {
        expression = expression.trim();
        var expressionLength = expression.length;
        function callback(error) {
            if (!updateInterface) return;
            if (error) this.update();
            if (!expressionLength)
                this.parent.removeChild(this);
            else
                this.updateSiblings();
            this._editCallback(expression);
        };
        this.property.parentObject.setPropertyValue(this.property.name, expression, callback.bind(this));
    },

    __proto__: WebInspector.ObjectPropertyTreeElement.prototype

};
