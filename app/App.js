//Fork of Chrome.ElementsPanel
WebInspector.CLOSETAG = WebInspector.OPENTAG = ''
var App = function() {
    WebInspector.View.call(this);
    this.element.addStyleClass("panel");
    this.element.addStyleClass("elements");

    this.registerRequiredCSS("elementsPanel.css");
    this.registerRequiredCSS("textPrompt.css");
    this.setHideOnDetach();

    const initialSidebarWidth = 325;
    const minimumContentWidthPercent = 0.34;
    const initialSidebarHeight = 325;
    const minimumContentHeightPercent = 0.34;
    this.createSidebarView(this.element, WebInspector.SidebarView.SidebarPosition.End, initialSidebarWidth, initialSidebarHeight);
    this.splitView.setSidebarElementConstraints(Preferences.minElementsSidebarWidth, Preferences.minElementsSidebarHeight);
    this.splitView.setMainElementConstraints(minimumContentWidthPercent, minimumContentHeightPercent);
    this.splitView.addEventListener(WebInspector.SidebarView.EventTypes.Resized, this._updateTreeOutlineVisibleWidth.bind(this));

    this._searchableView = new WebInspector.SearchableView(this);
    this.splitView.mainElement.addStyleClass("vbox");
    this._searchableView.show(this.splitView.mainElement);
    var stackElement = this._searchableView.element;

    this.contentElement = stackElement.createChild("div");
    this.contentElement.id = "elements-content";
    this.contentElement.addStyleClass("outline-disclosure");
    this.contentElement.addStyleClass("source-code");

    if (!WebInspector.settings.domWordWrap.get())
        this.contentElement.classList.add("nowrap");
    WebInspector.settings.domWordWrap.addChangeListener(this._domWordWrapSettingChanged.bind(this));

    this.contentElement.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
    this.splitView.sidebarElement.addEventListener("contextmenu", this._sidebarContextMenuEventFired.bind(this), false);
    

    this.treeOutline = new WebInspector.ElementsTreeOutline(true, true, this._populateContextMenu.bind(this), this._setPseudoClassForNodeId.bind(this));
    this.treeOutline.wireToDomAgent();
    this.treeOutline.addEventListener(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);

    this.element.addEventListener('keydown', this._treeKeyDown.bind(this), false);
    
    this._dockSideChanged();

    this._popoverHelper = new WebInspector.PopoverHelper(this.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(0);


    WebInspector.domAgent.addEventListener(WebInspector.DOMAgent.Events.DocumentUpdated, this._documentUpdatedEvent, this);

    if (WebInspector.domAgent.existingDocument())
        this._documentUpdated(WebInspector.domAgent.existingDocument());

    this.transformView= new TransformView(this.splitView._secondElement)
}

App.prototype = {

    decorateNodeLabel: function(node, parentElement) {
        var title = node.nodeNameInCorrectCase();
        var nameElement = document.createElement(node.isStateful ? 'strong' : 'span');
        nameElement.textContent = title;
        parentElement.appendChild(nameElement);
        parentElement.title = title;
    },

    _treeKeyDown: function(event) {
        if (event.target !== this.treeOutline.childrenListElement)
            return;

        if (!this.treeOutline.selectedTreeElement || !event.shiftKey || event.altKey || event.metaKey || event.ctrlKey)
            return;

        var nextNode;
        if (event.keyIdentifier === 'U+0008') this._lastValidSelectedNode.removeNode()

        if (nextNode) {
            this.selectDOMNode(nextNode, true);
            event.consume(true);
        }
    },

    createSidebarView: function(parentElement, position, defaultWidth, defaultHeight) {
        if (this.splitView)
            return;

        if (!parentElement)
            parentElement = this.element;

        this.splitView = new WebInspector.SidebarView(position, this._sidebarWidthSettingName(), defaultWidth, defaultHeight);
        this.splitView.show(parentElement);
        this.splitView.addEventListener(WebInspector.SidebarView.EventTypes.Resized, this.sidebarResized.bind(this));

        this.sidebarElement = this.splitView.sidebarElement;
    },

    sidebarResized: function(event) { },

    _sidebarWidthSettingName: function() {
        return "ElementsSidebarWidth";
    },

    /* END FROM PANEL */

    _updateTreeOutlineVisibleWidth: function() {
        if (!this.treeOutline)
            return;

        var width = this.splitView.element.offsetWidth;
        if (this.splitView.isVertical())
            width -= this.splitView.sidebarWidth();
        this.treeOutline.setVisibleWidth(width);
    },

    defaultFocusedElement: function() {
        return this.treeOutline.element;
    },

    statusBarResized: function() {
    },

    wasShown: function() {
        // Attach heavy component lazily
        if (this.treeOutline.element.parentElement !== this.contentElement)
            this.contentElement.appendChild(this.treeOutline.element);

        this.treeOutline.updateSelection();
        this.treeOutline.setVisible(true);

        if (!this.treeOutline.rootDOMNode)
            WebInspector.domAgent.requestDocument();
    },

    willHide: function() {
        WebInspector.domAgent.hideDOMNodeHighlight();
        this.treeOutline.setVisible(false);
        this._popoverHelper.hidePopover();

        // Detach heavy component on hide
        this.contentElement.removeChild(this.treeOutline.element);

        WebInspector.Panel.prototype.willHide.call(this);
    },

    onResize: function() {
        this.treeOutline.updateSelection();
    },

    createView: function(id) {
        if (!this._overridesView)
            this._overridesView = new WebInspector.OverridesView();
        return this._overridesView;
    },

    _setPseudoClassForNodeId: function(nodeId, pseudoClass, enable) {
        var node = WebInspector.domAgent.nodeForId(nodeId);
        if (!node)
            return;

        var pseudoClasses = node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
        if (enable) {
            pseudoClasses = pseudoClasses || [];
            if (pseudoClasses.indexOf(pseudoClass) >= 0)
                return;
            pseudoClasses.push(pseudoClass);
            node.setUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName, pseudoClasses);
        } else {
            if (!pseudoClasses || pseudoClasses.indexOf(pseudoClass) < 0)
                return;
            pseudoClasses.remove(pseudoClass);
            if (!pseudoClasses.length)
                node.removeUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName);
        }

        this.treeOutline.updateOpenCloseTags(node);
        WebInspector.cssModel.forcePseudoState(node.id, node.getUserProperty(WebInspector.ElementsTreeOutline.PseudoStateDecorator.PropertyName));
        this._metricsPaneEdited();
        this._stylesPaneEdited();

        WebInspector.notifications.dispatchEventToListeners(WebInspector.UserMetrics.UserAction, {
            action: WebInspector.UserMetrics.UserActionNames.ForcedElementState,
            selector: node.appropriateSelectorFor(false),
            enabled: enable,
            state: pseudoClass
        });
    },

    _selectedNodeChanged: function() {
        var selectedNode = this.selectedDOMNode();
        if (!selectedNode && this._lastValidSelectedNode)
            this._selectedPathOnReset = this._lastValidSelectedNode.path();


        this._updateSidebars();

        if (selectedNode) {
            this.transformView.loadData(selectedNode.id)
            //ConsoleAgent.addInspectedNode(selectedNode.id);
            this._lastValidSelectedNode = selectedNode;
        }
        WebInspector.notifications.dispatchEventToListeners(WebInspector.ElementsTreeOutline.Events.SelectedNodeChanged);
    },

    _updateSidebars: function() {
        for (var pane in this.sidebarPanes)
            this.sidebarPanes[pane].needsUpdate = true;

        this.updateInstance();
        this.updateEventListeners();
    },

    _reset: function() {
        delete this.currentQuery;
    },

    _documentUpdatedEvent: function(event) {
        this._documentUpdated(event.data);
    },

    _documentUpdated: function(inspectedRootDocument) {
        this._reset();
        this.searchCanceled();

        this.treeOutline.rootDOMNode = inspectedRootDocument;

        if (!inspectedRootDocument) {
            if (this.isShowing())
                WebInspector.domAgent.requestDocument();
            return;
        }

        function selectNode(candidateFocusNode) {
            if (!candidateFocusNode)
                candidateFocusNode = inspectedRootDocument;

            if (!candidateFocusNode)
                return;

            this.selectDOMNode(candidateFocusNode, true);
            if (this.treeOutline.selectedTreeElement)
                this.treeOutline.selectedTreeElement.expand();
        }

        function selectLastSelectedNode(nodeId) {
            if (this.selectedDOMNode()) {
                // Focused node has been explicitly set while reaching out for the last selected node.
                return;
            }
            var node = nodeId ? WebInspector.domAgent.nodeForId(nodeId) : null;
            selectNode.call(this, node);
        }

        if (this._selectedPathOnReset)
            WebInspector.domAgent.pushNodeByPathToFrontend(this._selectedPathOnReset, selectLastSelectedNode.bind(this));
        else
            selectNode.call(this);
        delete this._selectedPathOnReset;
    },

    searchCanceled: function() {
        delete this._searchQuery;
        this._hideSearchHighlights();

        delete this._currentSearchResultIndex;
        delete this._searchResults;
        WebInspector.domAgent.cancelSearch();
    },

    performSearch: function(query, shouldJump) {
        // Call searchCanceled since it will reset everything we need before doing a new search.
        this.searchCanceled();

        const whitespaceTrimmedQuery = query.trim();
        if (!whitespaceTrimmedQuery.length)
            return;

        this._searchQuery = query;

        function resultCountCallback(resultCount)
        {
            if (!resultCount)
                return;

            this._searchResults = new Array(resultCount);
            this._currentSearchResultIndex = -1;
            if (shouldJump)
                this.jumpToNextSearchResult();
        }
        WebInspector.domAgent.performSearch(whitespaceTrimmedQuery, resultCountCallback.bind(this));
    },

    _contextMenuEventFired: function(event) {
        function toggleWordWrap() {
            WebInspector.settings.domWordWrap.set(!WebInspector.settings.domWordWrap.get());
        }

        var contextMenu = new WebInspector.ContextMenu(event);
        // Disabled
        contextMenu.appendCheckboxItem(WebInspector.UIString(WebInspector.useLowerCaseMenuTitles() ? "Word wrap" : "Word Wrap"), toggleWordWrap.bind(this), WebInspector.settings.domWordWrap.get());

        contextMenu.show();
    },

    _showNamedFlowCollections: function() {
        if (!WebInspector.cssNamedFlowCollectionsView)
            WebInspector.cssNamedFlowCollectionsView = new WebInspector.CSSNamedFlowCollectionsView();
        WebInspector.cssNamedFlowCollectionsView.showInDrawer();
    },

    _domWordWrapSettingChanged: function(event) {
        if (event.data)
            this.contentElement.removeStyleClass("nowrap");
        else
            this.contentElement.addStyleClass("nowrap");

        var selectedNode = this.selectedDOMNode();
        if (!selectedNode)
            return;

        var treeElement = this.treeOutline.findTreeElement(selectedNode);
        if (treeElement)
            treeElement.updateSelection(); // Recalculate selection highlight dimensions.
    },

    switchToAndFocus: function(node) {
        // Reset search restore.
        WebInspector.searchController.cancelSearch();
        WebInspector.inspectorView.setCurrentPanel(this);
        this.selectDOMNode(node, true);
    },

    _populateContextMenu: function(contextMenu, node) {
        // Add debbuging-related actions
        contextMenu.appendSeparator();
        var pane = WebInspector.domBreakpointsSidebarPane;
        pane.populateNodeContextMenu(node, contextMenu);
    },

    _getPopoverAnchor: function(element) {
        var anchor = element.enclosingNodeOrSelfWithClass("webkit-html-resource-link");
        if (anchor) {
            if (!anchor.href)
                return null;
            // Disabled image loading
        }
        return anchor;
    },

    _loadDimensionsForNode: function(treeElement, callback) {
        // We get here for CSS properties, too, so bail out early for non-DOM treeElements.
        if (treeElement.treeOutline !== this.treeOutline) {
            callback();
            return;
        }

        var node = (treeElement.representedObject);

        if (!node.nodeName() || node.nodeName().toLowerCase() !== "img") {
            callback();
            return;
        }

        WebInspector.RemoteObject.resolveNode(node, "", resolvedNode);

        function resolvedNode(object) {
            if (!object) {
                callback();
                return;
            }

            object.callFunctionJSON(dimensions, undefined, callback);
            object.release();

            function dimensions() {
                return { offsetWidth: this.offsetWidth, offsetHeight: this.offsetHeight, naturalWidth: this.naturalWidth, naturalHeight: this.naturalHeight };
            }
        }
    },

    _showPopover: function(anchor, popover) {
        var listItem = anchor.enclosingNodeOrSelfWithNodeName("li");
        if (listItem && listItem.treeElement)
            this._loadDimensionsForNode(listItem.treeElement, WebInspector.DOMPresentationUtils.buildImagePreviewContents.bind(WebInspector.DOMPresentationUtils, anchor.href, true, showPopover));
        else
            WebInspector.DOMPresentationUtils.buildImagePreviewContents(anchor.href, true, showPopover);

        function showPopover(contents) {
            if (!contents)
                return;
            popover.setCanShrink(false);
            popover.show(contents, anchor);
        }
    },

    jumpToNextSearchResult: function() {
        if (!this._searchResults)
            return;

        this._hideSearchHighlights();
        if (++this._currentSearchResultIndex >= this._searchResults.length)
            this._currentSearchResultIndex = 0;

        this._highlightCurrentSearchResult();
    },

    jumpToPreviousSearchResult: function() {
        if (!this._searchResults)
            return;

        this._hideSearchHighlights();
        if (--this._currentSearchResultIndex < 0)
            this._currentSearchResultIndex = (this._searchResults.length - 1);

        this._highlightCurrentSearchResult();
    },

    _highlightCurrentSearchResult: function() {
        var index = this._currentSearchResultIndex;
        var searchResults = this._searchResults;
        var searchResult = searchResults[index];

        if (searchResult === null) {
            WebInspector.searchController.updateCurrentMatchIndex(index, this);
            return;
        }

        if (typeof searchResult === "undefined") {
            // No data for slot, request it.
            function callback(node) {
                searchResults[index] = node || null;
                this._highlightCurrentSearchResult();
            }
            WebInspector.domAgent.searchResult(index, callback.bind(this));
            return;
        }

        WebInspector.searchController.updateCurrentMatchIndex(index, this);

        var treeElement = this.treeOutline.findTreeElement(searchResult);
        if (treeElement) {
            treeElement.highlightSearchResults(this._searchQuery);
            treeElement.reveal();
            var matches = treeElement.listItemElement.getElementsByClassName("highlighted-search-result");
            if (matches.length)
                matches[0].scrollIntoViewIfNeeded();
        }
    },

    _hideSearchHighlights: function() {
        if (!this._searchResults)
            return;
        var searchResult = this._searchResults[this._currentSearchResultIndex];
        if (!searchResult)
            return;
        var treeElement = this.treeOutline.findTreeElement(searchResult);
        if (treeElement)
            treeElement.hideSearchHighlights();
    },

    selectedDOMNode: function() {
        return this.treeOutline.selectedDOMNode();
    },

    selectDOMNode: function(node, focus) {
        this.treeOutline.selectDOMNode(node, focus);
    },

    updateInstance: function() {
        var node = this.selectedDOMNode();
        if (node) 
            WebInspector.RemoteObject.resolveNode(node, 'famous_panel_instance', nodeResolved.bind(this));

        function nodeResolved(object) {
            if (object) object.getOwnProperties(propertiesResolved.bind(this));
        }

        function propertiesResolved(properties) {
            var props = WebInspector.RemoteObject.fromPrimitiveValue(null);
            for (var i = 0; i < properties.length; ++i) {
                if (properties[i].name == 'adnan') {
                    props = properties[i].value;
                }
                //pane.update(props);
            }
        }
    },

    updateEventListeners: function() {
        // var eventListenersSidebarPane = this.sidebarPanes.eventListeners;
        // if (!eventListenersSidebarPane.isShowing() || !eventListenersSidebarPane.needsUpdate)
        //     return;

        // eventListenersSidebarPane.update(this.selectedDOMNode());
        // eventListenersSidebarPane.needsUpdate = false;
    },

    handleShortcut: function(event) {
        function handleUndoRedo() {
            if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && !event.shiftKey && event.keyIdentifier === "U+005A") { // Z key
                WebInspector.domAgent.undo(this._updateSidebars.bind(this));
                event.handled = true;
                return;
            }

            var isRedoKey = WebInspector.isMac() ? event.metaKey && event.shiftKey && event.keyIdentifier === "U+005A" : // Z key
                    event.ctrlKey && event.keyIdentifier === "U+0059"; // Y key
            if (isRedoKey) {
                DOMAgent.redo(this._updateSidebars.bind(this));
                event.handled = true;
            }
        }

        if (!this.treeOutline.editing()) {
            handleUndoRedo.call(this);
            if (event.handled)
                return;
        }

        this.treeOutline.handleShortcut(event);
    },

    handleCopyEvent: function(event) {
        // Don't prevent the normal copy if the user has a selection.
        if (!window.getSelection().isCollapsed)
            return;
        event.clipboardData.clearData();
        event.preventDefault();
        this.selectedDOMNode().copyNode();
    },

    sidebarResized: function(event) {
        this.treeOutline.updateSelection();
    },

    _inspectElementRequested: function(event) {
        var node = event.data;
        this.revealAndSelectNode(node.id);
    },

    revealAndSelectNode: function(nodeId) {
        // WebInspector.inspectorView.setCurrentPanel(this);

        var node = WebInspector.domAgent.nodeForId(nodeId);
        if (!node)
            return;

        WebInspector.domAgent.highlightDOMNodeForTwoSeconds(nodeId);
        this.selectDOMNode(node, true);
    },

    appendApplicableItems: function(event, contextMenu, target) {
        function selectNode(nodeId) {
            if (nodeId)
                WebInspector.domAgent.inspectElement(nodeId);
        }

        function revealElement(remoteObject) {
            remoteObject.pushNodeToFrontend(selectNode);
        }

        var commandCallback;
        if (target instanceof WebInspector.RemoteObject) {
            var remoteObject = (target);
            if (remoteObject.subtype === "node")
                commandCallback = revealElement.bind(this, remoteObject);
        } else if (target instanceof WebInspector.DOMNode) {
            var domNode = (target);
            if (domNode.id)
                commandCallback = WebInspector.domAgent.inspectElement.bind(WebInspector.domAgent, domNode.id);
        }
        if (!commandCallback)
            return;
        // Skip adding "Reveal..." menu item for our own tree outline.
        if (this.treeOutline.element.isAncestor(event.target))
            return;
        contextMenu.appendItem(WebInspector.useLowerCaseMenuTitles() ? "Reveal in Elements panel" : "Reveal in Elements Panel", commandCallback);
    },

    _sidebarContextMenuEventFired: function(event) {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.show();
    },

    _dockSideChanged: function() {
        var vertically = false;
        this._splitVertically(vertically);
    },

    _splitVertically: function(vertically) {
        if (this.sidebarPaneView && vertically === !this.splitView.isVertical())
            return;

        if (this.sidebarPaneView)
            this.sidebarPaneView.detach();

        this.splitView.setVertical(!vertically);

        if (!vertically) {
            this.sidebarPaneView = new WebInspector.SidebarPaneStack();
        } else {
            this.sidebarPaneView = new WebInspector.SidebarTabbedPane();
        }
        for (var pane in this.sidebarPanes)
            this.sidebarPaneView.addPane(this.sidebarPanes[pane]);
        this.sidebarPaneView.show(this.splitView.sidebarElement);
    },

    forceUpdate: function(args) {
        var node = this.selectedDOMNode();
        if (!node) return;
        WebInspector.RemoteObject.resolveNode(node, 'famous_panel_instance', nodeResolved.bind(this));
        function nodeResolved(object) {
            function forceUpdate(serializedArgs) {
                if (this.forceUpdate) 
                    this.forceUpdate(serializedArgs)
            }

            if (object) {
                object.callFunction(forceUpdate, [args]);
            }
        }
    },

    __proto__: WebInspector.View.prototype
}
