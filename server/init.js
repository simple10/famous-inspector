RuntimeClient.init(function (err) {
    if (err) return
    var elements = chrome.devtools.panels.elements;
    chrome.devtools.panels.create('Famo.us', 'famous.png', 'app/app.html', function(panel) { panel.onShown.addListener(init) });
});


function init(panel) {
    panel.initialize({
        InspectorBackend: InspectorBackend,
        DOMAgent: DOMAgent,
        RuntimeAgent: RuntimeAgent
    });
}
