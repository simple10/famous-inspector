var InspectorBackend = {
  notifyDOM: function(method, args) {
      this.dispatch &&
          this.dispatch[method].apply(this._domDispatcher, args);
  },

  registerDOMDispatcher: function(dispatch) { DOMAgent.init(this.dispatch = dispatch) }
};
