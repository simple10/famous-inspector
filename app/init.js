// Prevent initialization

window.removeEventListener("DOMContentLoaded", windowLoaded, false);

// Hook up click handler

document.addEventListener("click", function(event) {
    var anchor = event.target.enclosingNodeOrSelfWithNodeName("a");
    if (!anchor || (anchor.target === "_blank"))
        return;

    // Prevent the link from navigating, since we don't do any navigation by following links normally.
    event.consume(true);

    function followLink() {
        if (WebInspector.isBeingEdited(event.target)) {
            return;
        }

        // Dispatch through main app
        chrome.devtools.panels.openResource(anchor.href, anchor.lineNumber);
    }

    if (WebInspector.followLinkTimeout)
        clearTimeout(WebInspector.followLinkTimeout);

    if (anchor.preventFollowOnDoubleClick) {
        // Start a timeout if this is the first click, if the timeout is canceled
        // before it fires, then a double clicked happened or another link was clicked.
        if (event.detail === 1)
            WebInspector.followLinkTimeout = setTimeout(followLink, 333);
        return;
    }

    followLink();
}, false);

// Monkey patch some url resolution

WebInspector.Linkifier.prototype.linkifyLocation =
    function(sourceURL, lineNumber, columnNumber, classes) {
        return WebInspector.linkifyResourceAsNode(sourceURL, lineNumber, classes);
    };

WebInspector.Linkifier.prototype.linkifyRawLocation =
    function(rawLocation, classes) {
        return WebInspector.linkifyURLAsNode("", "", classes, false);
        return anchor;
    };

WebInspector.resourceForURL = function() {
    return null;
};

WebInspector.workspace = {
    uiSourceCodeForURL: function() { return null; }
};

loadScript = function () { return }
debugCSS = true;

WebInspector.View.prototype._registerRequiredCSS = WebInspector.View.prototype.registerRequiredCSS;
WebInspector.View.prototype.registerRequiredCSS = function(cssFile) {
    this._registerRequiredCSS('../chrome/' + cssFile);
};

WebInspector.debuggerModel = {
    selectedCallFrame: function() {}
};

// Monkey patch DOM node constructor to allow custom extensions to the payload

WebInspector._DOMNode = WebInspector.DOMNode;
WebInspector.DOMNode = function(domAgent, doc, isInShadowTree, payload) {
    WebInspector._DOMNode.apply(this, arguments);
    if (payload.ownerId) {
        this.ownerNode = domAgent._idToDOMNode[payload.ownerId];
    }
    this.isStateful = !!payload.stateful;
};

WebInspector.DOMNode.prototype = WebInspector._DOMNode.prototype;
WebInspector.DOMNode.prototype.constructor = WebInspector.DOMNode;

for (var key in WebInspector._DOMNode) {
    if (WebInspector._DOMNode.hasOwnProperty(key)) {
        WebInspector.DOMNode[key] = WebInspector._DOMNode[key];
    }
}

WebInspector.DOMNode.prototype.nodeNameInCorrectCase =
    WebInspector.DOMNode.prototype.nodeName;



function initialize(agents) {
	  mixpanel.track("FAMOUS INSPECTOR INIT");

    this.DOMAgent = agents.DOMAgent;
    this.InspectorBackend = agents.InspectorBackend;
    
    WebInspector.domAgent = new WebInspector.DOMAgent();
    WebInspector.runtimeModel = new WebInspector.RuntimeModel({ addEventListener: function(){} });
    WebInspector.installPortStyles();

    var panel = new App();
    panel.markAsRoot();
    panel.show(document.getElementById('main-panel-holder'));

    WebInspector.inspectorView = panel;

    WebInspector.domAgent.addEventListener(
        WebInspector.DOMAgent.Events.InspectNodeRequested,
        function(event) { panel.revealAndSelectNode(event.data); }
    );

}
