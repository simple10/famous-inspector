var RuntimeClient
(function() {
    var queuedCallbacks = null;
    function runtimeLoaded(result, isException) {
        var callbacks = queuedCallbacks;
        queuedCallbacks = null;
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](isException);
        }
        InspectorBackend.notifyDOM('documentUpdated');
        DOMAgent.init();
    }

    function loadRuntime() {
        var module = {}, 
            deps = {},
            inflight = 0;

        function get(fileName, cb) {
            inflight += 1
            var xhr = new XMLHttpRequest()
            xhr.onload = function() {
                cb(xhr)
                if (--inflight == 0) complete()
            }
            xhr.open('GET', chrome.extension.getURL(fileName), true);
            xhr.send();
        }

        function require(name, fileName, dependency) {
            deps[name] = dependency || []
            get(fileName, function(xhr) { module[name] = xhr.responseText; })
        }

        function complete() {
            var script ='Famous = { Famous: (function() {})() };\n\n';
            for (var mod in deps) {
                var dependencies = deps[mod].map(function(dep) { return 'Famous' + '.' + dep; });
                dependencies.push('this', '"' + 'Famous' + '"');
                script += 'Famous' + '.' + mod + ' = ' + module[mod] + '(' + dependencies + ');';
            }
            script += '//@ sourceURL=InjectedRuntime.js';
            chrome.devtools.inspectedWindow.eval(script, runtimeLoaded);
            chrome.devtools.inspectedWindow.eval('Runtime = Famous._DOM')
        }

        require('DOM', '/server/FamousParasite.js');
        get('/chrome/InspectorOverlayPage.html', function (xhr) {
            var addPage = "this." + ('__InspectorOverlayPage_html' + " = " + JSON.stringify(xhr.responseText) + ";")
            chrome.devtools.inspectedWindow.eval(addPage)
        });
        
    }

    RuntimeClient = {
        init: function(callback) {
            RuntimeClient.call('DOM.reset', function(result, error) {
                callback(error);
            });
        },

        call: function(methodName, callback) {
            var methodSignature = methodName + '(';
            for (var i = 1; i < arguments.length - 1; i++) {
                if (i > 1) methodSignature += ',';
                methodSignature += JSON.stringify(arguments[i]);
            }
            methodSignature += ')';
            RuntimeClient.eval(methodSignature, arguments[arguments.length - 1]);
        },

        eval: function(methodSignature, callback) {
            function retry(error) {
                error ? callback(null, error) : RuntimeClient.eval(methodSignature, callback);
            }

            if (queuedCallbacks) return queuedCallbacks.push(retry);
            chrome.devtools.inspectedWindow.eval('Famous' + '.' + methodSignature, Return);

            function Return(result, error) {
                if (error && error.value.indexOf('Famous') !== -1) 
                    return queuedCallbacks ? queuedCallbacks.push(retry) : loadRuntime(queuedCallbacks = [retry])
                else
                    callback(result, error)
            }
        }
    };
})();
