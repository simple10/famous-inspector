(function() {
    if (! window.require || ! window.context)  return console.log('context must be exposed on the window')
    var Transform = require('famous/core/Transform')
    var registry = {}
    var id = 0

    registry['famous_root_element'] = registry[0]
    registry['famous_root_document'] = require('famous/core/Engine')
    
    traverse(window.context, function (d) {
        d.id = d.id || (id++)
        registry[d.id] = d
    })

    return {
        traverse: traverse,

        setFamousProperty : function (id, transform) {
            var node = registry[id]
            var obj = node && node._object
            for (var k in transform) transform[k] = transform[k].split(':').map(parseFloat)
            transform = Transform.build(transform)        
            if (!obj) return

            if (node._isModifier) {
                obj.setTransform && 
                    obj.setTransform(transform)
            }
            if (node._isRenderable) {
                var save = obj.commit
                obj.commit = function (ctx) {
                    save.call(obj, {transform: Transform.multiply(ctx.transform, transform)})
                }
            }
        },

        getSpec:function (id) {
            var node = registry[id]
            if (! node || ! (node = node._object)) return
            if (node._matrix) return processMat(node._matrix)
            if (node._output && node._output.transform) return processMat(node._output.transform)
        },
        getDocument: function() {
            var rootNodes = [domify(registry[0])]//TODO MULTIPLE CONTEXTS

            var root = {
                nodeId: 'famous_root_element',
                nodeType: 1,
                nodeName: 'Engine',
                localName: 'Engine',
                attributes: [],
                childNodeCount: rootNodes.length,
                children: rootNodes
            };

            return {
                baseURL: 'famous://',
                nodeId: 'famous_root_document',
                nodeType: 9,
                nodeName: 'document',
                localName: 'document',
                attributes: [],
                childNodeCount: 1,
                children: [root]
            };
        },

        getChildNodes : function() {},
        getNodeForPath: function() {},
        inspectDOMNode: function() { },
        resolveNode: function(id, group) {
            //don't send nodes back and forth because its super slow
            return
            return InjectedScript.wrapObject({props: d._object || d}, group, true, true);
        },

        highlightNode:  function(id) {
            return
            var bounds = [0,0,0,0]
            var transform = FamousParasite.getSpec(registry[id])
            //add iframe with canvas
            traverse(registry[id], function (node) {
                if (node.content == null)  return
                //get only surfaces
                //get Dimensions of dom node
                //min the bounds 
            })
            //draw sphere in bounds * transform
        },

        reset: function() {},
        getChanges: function() { return [] },
        hideHighlight: function() {},
        getEventListenersForNode: function(id) {
            return registry[id].eventHandler.downstreamFn
        }
    }

    function domify(renderNode) {
        var name = (renderNode._object || renderNode).constructor.name
        var children = (renderNode.children || [])
                .map(function (d) { return (domify(d)) })

        var _node = {
            nodeId: renderNode.id,
            nodeType: 1,
            childNodeCount: children.length,
            localName: name,
            nodeName: name,
            ownerId: (renderNode.parent || {}).id,
            children: children,
            attributes: []
        }

        return _node

    }
    function processMat (d) {
        var m = Transform.interpret(d)
        for(var space in m) m[space] = m[space].join(':')
        return m
    }

    function extend(a, b) {
        for(var k in b) a[k] = b[k]
        return a
    }

    function traverse(d, cb) {
        cb(d)
        var children = (d._node && d._node._child) ? d._node._child : d._child
        if (d._object && d._object.context) { children = d.children = d._object.context }
        children = children ? (children.map ? children : [children]) : []
        d.children = children
        children.forEach(function (child) { traverse(child, cb)  })
    }
})
