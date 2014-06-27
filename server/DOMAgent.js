var DOMAgent = {
    getDocument: function(callback) {
        RuntimeClient.call('DOM.getDocument',
                           function(result, error) {
                               callback(error, result);
                           }
                          );
    },
    
    setFamousProperties: function (id, transform, callback) {
        RuntimeClient.call('DOM.setFamousProperty', id, transform,
                           function (result, error) { callback(error, result)
                                                    })
    },

    getSpec: function (id, callback) {
        RuntimeClient.call('DOM.getSpec', id, function (result, error) {
            callback(error, result)
        })
    },

    requestChildNodes: function(nodeId, depth, callback) {
        RuntimeClient.call('DOM.getChildNodes', nodeId, depth,
                           function(result, error) {
                               if (error) return callback(error);
                               InspectorBackend.notifyDOM('setChildNodes', [nodeId, result]);
                               callback(null);
                           })
    },

    getAttributes: function(nodeId, callback) {},

    getEventListenersForNode: function(id, objectGroupId, callback) {
        RuntimeClient.call('DOM.getEventListenersForNode', id, objectGroupId,
                           function(result, error) { callback(error, result) }
                          );
    },

    requestNode: function(objectId, callback) { },

    resolveNode: function(nodeId, objectGroup, callback) {
        RuntimeClient.call('DOM.resolveNode', nodeId, objectGroup,
                           function(result, error) { callback(error, result) }
                          );
    },

    pushNodeByPathToFrontend: function(path, callback) {
        RuntimeClient.call('DOM.getNodeForPath', path,
                           function(result, error) {
                               if (error) return callback(error);
                               var changeLog = result.changeLog;
                               for (var i = 0; i < changeLog.length; i++) {
                                   var change = changeLog[i];
                                   InspectorBackend.notifyDOM(change.method, change.args);
                               }
                               callback(null, result.node ? result.node.nodeId : 0);
                           }
                          );
    },
    setInspectModeEnabled: function() {},
    performSearch: function(query, callback) {},
    getSearchResults: function(searchId, index, index2, callback) {},
    querySelector: function(nodeId, selectors, callback) {},
    querySelectorAll: function(nodeId, selectors, callback){},
    markUndoableState: function() {},
    undo: function() {},
    redo: function() {},
    highlightNode: function(config, nodeId) {
        if (nodeId === 'famous_root_element') return;
        if (nodeId) RuntimeClient.call('DOM.highlightNode', nodeId, config, function() { });
    },

    hideHighlight: function() {
        RuntimeClient.call('DOM.hideHighlight', function() { });
    },

    setNodeName: function(id, name, callback) { callback('Not implemented'); },
    setNodeValue: function(id, value, callback) {
        RuntimeClient.call('DOM.setNodeValue', id, value,
                           function(result, error) { callback(error) }
                          )
    },
    setAttributesAsText: function(id, text, name, callback) {
        RuntimeClient.call('DOM.setAttributesAsText', id, text, name,
                           function(result, error) { callback(error) }
                          );
    },
    setAttributeValue: function(id, name, value, callback) {},
    removeAttribute: function(id, name, callback) { },
    getOuterHTML: function(id, callback) { /* disabled */ },
    setOuterHTML: function(id, html, callback) { /* disabled */  },
    removeNode: function(id, callback) {
        RuntimeClient.call('DOM.removeNode', id, function (result, error) {
            callback(error)
        })
    },
    moveTo: function(id, targetNodeId, anchorNodeId, callback) {},
    _pollForChanges: function() {
        RuntimeClient.call('DOM.getChanges', function(result, error) {
            if (error) {
                DOMAgent._polling = false;
                return; // Stop polling
            }
            if (result) {
                for (var i = 0; i < result.length; i++) {
                    var change = result[i];
                    InspectorBackend.notifyDOM(change.method, change.args);
                }
            }
            setTimeout(DOMAgent._pollForChanges, 300);
        });
    },

    init: function() {
        if (DOMAgent._polling) return;
        if (!InspectorBackend._domDispatcher) return;
        DOMAgent._polling = true;
        setTimeout(DOMAgent._pollForChanges, 300);
    }
};
