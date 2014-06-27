# Famous Inspector

## Installation
Clone the GitHub repository.

```
git clone git@github.com:famousinternal/famous-inspector.git
```

Open the URL [chrome://extensions/](chrome://extensions/) in your browser.

Check the box for **Developer Mode**

Click the button **Load unpacked extension...**

Select the folder where you downloaded the repository.

The extension is now installed.

## Usage
Open the devtools on any page containing the requireJS build of famous
and an exposed window.context. To test it out, try opening test.html

## Project Structure
`js/` contains the server that the UI talks through to the famous runtime.

`App/` contains the web inspector client that sits within devtools.

`App/init.js` bootstraps the extension UI and patches all the APIs needed to connect
to famous. This is the only file needed in the folder.

`server/FamousParasite.js` is the main glue that hooks into famous and translates it into
the language of the web inspector code.

`server/InjectedScriptHost.js` stubs out a host environment used by the InjectedScriptSource
module, in the inspector package.

`server/InspectorBackend.js` tracks events from the host and sends them to extension.

`server/RuntimeAgent.js` exposes objects on the host to the extension

`server/RuntimeClient.js` runs in any of the web inspector pages, and adds the runtime into the
user's page. This module is also responsible for loading scripts extension
side. There is some ad hoc dependency management for building large extensions in
order if that is necessary.

`chrome/*` is a list of files forked from
https://chromium.googlesource.com/chromium/blink.git/+/master/Source/devtools/front_end/
to bootstrap the builtin web inspector.

`App/InspectorOverlayPage.html` is an experimental threejs overlay for unity-like
handles to allow you to transform matrices with your hands. Would be really easy in
famous mixed-mode(stencil/clear the surface dimensions), so rather than perfect it
I'll leave it as a proof of concept of how to hook into this frame

### Repurposing server for a new extension
- Most of the builtin extension mechanisms are really bad for a number of reasons
- so we wrap eval in a client server. 
- To create a new UI ontop of the existing system,just `rm -rf chrome app/*.js`
- add a new `app/init.js`
- and hook into agents.domAgent which will call out to server/DomAgent.js -> server/FamousParasite.js

###todo
- [ ] quiet mode for hiding modifiers 
- [ ] add gestures for rotateAxis and higher level transforms. drag/pull on inputs
- [ ] add inputs for skew, color, origin, aline 
- [ ] tweening and animation
- [ ] maniputale Scene Definition instead of object notation?
- [ ] redo tree ui for virtual scrolling, nuke chrome folder and allow single medium of communication
- [ ] make inputs read mind
- [ ] leap motion integration
