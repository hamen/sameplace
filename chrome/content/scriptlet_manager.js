/*
  Copyright (C) 2007 by Massimiliano Mirra

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA

  Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>
*/

// DEFINITIONS
// ----------------------------------------------------------------------

const Cc = Components.classes;
const Ci = Components.interfaces;


// STATE
// ----------------------------------------------------------------------

var scriptlets = {};
load('chrome://sameplace/contact/scriptlets.js', scriptlets);


// INITIALIZATION/FINALIZATION
// ----------------------------------------------------------------------

function init(event) {
    scriptlets.init();
    refreshScriptlets();
}


// GUI ACTIONS
// ----------------------------------------------------------------------

function refreshScriptlets() {
    while($('#scriptlets')._.lastChild)
        $('#scriptlets')._.removeChild($('#scriptlets')._.lastChild)

    scriptlets.forEach(
        function(scriptlet) {
            var xulScriptlet = $('#blueprints > .scriptlet')._.cloneNode(true);
            $(xulScriptlet).$('.name')._.value = scriptlet.info.name;
            $(xulScriptlet).$('.version')._.value = scriptlet.info.version;
            $(xulScriptlet).$('.description')._.value = scriptlet.info.description;
            $(xulScriptlet).$('.filename')._.value = scriptlet.fileName;
            $('#scriptlets')._.appendChild(xulScriptlet);
        });
}


// GUI REACTIONS
// ----------------------------------------------------------------------

var dndObserver = {
    onDrop: function(event, transferData, session) {
        if(transferData.flavour.contentType == 'text/x-moz-url') {
            var parts = transferData.data.split('\n');
            var url = parts[0];
            var name = parts[1];
            if(name.match(/\.js$/))
                requestedInstallRemoteScriptlet(url, name);
        }
    },

    onDragOver: function(event, flavour, session) {},

    getSupportedFlavours: function() {
        if(!this._flavourSet) {
            this._flavourSet = new FlavourSet();
            this._flavourSet.appendFlavour("text/x-moz-url");
            this._flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
        }
        return this._flavourSet;
    }
};

function requestedInstallRemoteScriptlet(url, name) {
    if(window.confirm(
           'Scriptlets are like extensions: malicious ones can harm your computer!\n' +
           'Only proceed if you trust the source.'))
        installRemoteScriptlet(url, name);
}

function installRemoteScriptlet(url, name) {
    var process = {
        start       : { ok: 'requestData' },
        requestData : { ok: 'saveData', error: 'alertUser' },
        saveData    : { ok: 'refreshScriptlets', error: 'alertUser' }
    };

    var steps = {
        requestData: function(next, url, name) {
            var req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.onreadystatechange = function(event) {
                if(req.readyState == 4) {
                    if(req.status == 200)
                        next('ok', name, req.responseText);
                    else
                        next('error', 'Error loading scriptlet.');
                }
            };
            req.send(null);
        },

        saveData: function(next, name, data) {
            try {
                var file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
                file.initWithFile(scriptlets.dir);
                file.append(name);

                var foStream = Cc['@mozilla.org/network/file-output-stream;1']
                .createInstance(Ci.nsIFileOutputStream);
                
                foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
                foStream.write(data, data.length);
                foStream.close();
                next('ok');
            } catch(e) {
                next('error', 'Error while saving file. (' + e + ')');
            }
        },

        alertUser: function(next, message) {
            window.alert(message);
        },

        refreshScriptlets: function(next) {
            refreshScriptlets();
        }
    };

    execute(process, steps, url, name);
}

function uninstall(xulUninstall) {
    scriptlets.get($(xulUninstall).$('^ .scriptlet .filename')._.value).uninstall();
    refreshScriptlets();
}

function reload(xulReload) {
    var fileName = $(xulReload).$('^ .scriptlet .filename')._.value;
    scriptlets.get(fileName).reload();
    if(window.opener.scriptlets)
        window.opener.scriptlets.get(fileName).reload();
}

function doOk() {

}

function doCancel() {

}


// GUI UTILITIES
// ----------------------------------------------------------------------

function _(id) {
    return document.getElementById(id);
}
