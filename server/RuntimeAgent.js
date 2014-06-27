var RuntimeAgent = {
  releaseObject: function(objectId) {
    RuntimeClient.call('Runtime.releaseObject', objectId, function(){});
  },

  releaseObjectGroup: function(objectGroup) {
    RuntimeClient.call('Runtime.releaseObjectGroup', objectGroup, function(){});
  },

  evaluate: function(expression, extension, exposeCommandLineAPI, doNotPauseOnExceptionsAndMuteConsole, contextId, returnByValue, generatePreview, callback) {
    RuntimeClient.call('Runtime.evaluate', expression, contextId, exposeCommandLineAPI, returnByValue, generatePreview, function(response, error) {
      callback(error, response.result, response.wasThrown);
    });
  },

  callFunctionOn: function(objectId, functionDeclaration, args, doNotPauseOnExceptionsAndMuteConsole, returnByValue, generatePreview, callback) {
    RuntimeClient.call('Runtime.callFunctionOn', objectId, functionDeclaration, args, returnByValue, function(response, error) {
        
      callback(error, response.result, response.wasThrown);
    });
  },

  getProperties: function(objectId, ownProperties, accessorPropertiesOnly, callback) {
    RuntimeClient.call('Runtime.getProperties', objectId, ownProperties, accessorPropertiesOnly, function(result, error) {
      callback(error, result, null);
    });
  }
};

RuntimeAgent.evaluate.invoke = function(params, callback) {
  RuntimeAgent.evaluate(
    params.expression,
    params.extension,
    params.exposeCommandLineAPI,
    params.doNotPauseOnExceptionsAndMuteConsole,
    params.contextId,
    params.returnByValue,
    params.generatePreview,
    callback
  );
};
