/*
 * Copyright 2017 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * -----------------------------------------------------------------------------
 *
 * Adapted from: https://github.com/AVGP/terminal.js (https://github.com/AVGP/terminal.js/blob/gh-pages/terminal.js)
 * See the original license info below.
 *
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Martin N.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
var TextTerm = (function() {
    var history = (localStorage.getItem("history") ? localStorage.getItem("history").split(",") : []),
        historyIndex = history.length;
    self = {};

    var KEY_UP   = 38,
        KEY_DOWN = 40;

    var updateHistory = function(cmd) {
        history.push(cmd);
        localStorage.setItem("history", history);
        historyIndex = history.length;
    };

    var browseHistory = function(direction) {
        var changedInput = false;
        if(direction == KEY_UP && historyIndex > 0) {
            self.inputElem.textContent = history[--historyIndex];
            changedInput = true;
        } else if(direction == KEY_DOWN) {
            if(historyIndex < history.length) ++historyIndex;
            if(historyIndex < history.length) self.inputElem.textContent = history[historyIndex];
            else self.inputElem.textContent = "";
            changedInput = true;
        }
        if(changedInput) {
            var range = document.createRange();
            var sel = window.getSelection();
            range.setStart(self.inputElem.childNodes[0], self.inputElem.textContent.length);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    var generateUUID = function() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    var resetTextTerm = function() {
        var pairs = self.textTermElem.querySelectorAll(".textterm-pair");
        for (var i = 0; i < pairs.length - 1; i++) {
            self.textTermElem.removeChild(pairs[i]);
        }
        self.promptElem.textContent = "";
        self.inputElem.textContent = "";
    }

    var requestData = function() {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if(xhr.status == 200) {
                    var data = JSON.parse(xhr.responseText);
                    if (data.resetRequired) {
                        resetTextTerm();
                    }
                    var groupCount = data.messageGroups.length;
                    console.log("groupCount: " + groupCount);
                    for(k = 0; k < groupCount; k++) {
                        var settingsCount = applySettings(data.messageGroups[k].settings);
                        var msgCount = data.messageGroups[k].messages.length;
                        console.log("msgCount: " + msgCount);
                        if (msgCount > 0) {
                            var newPrompt = "";
                            for (i = 0; i < msgCount; i++) {
                                newPrompt += data.messageGroups[k].messages[i];
                            }
                            if(settingsCount > 0) {
                                createNewTextTermPair("");
                            }
                            self.promptElem.innerHTML += newPrompt;
                            self.textTermElem.scrollTop = self.textTermElem.scrollHeight;
                            self.inputElem.focus();
                        }
                    }
                    console.log("action: " + data.action);
                    if (data.action != 'NONE') {
                        self.action = data.action;
                    }
                    var textSecurity = (self.action == 'READ_MASKED') ? "disc" : "none";
                    self.inputElem.style["-webkit-text-security"] = textSecurity;
                    self.inputElem.style["text-security"] = textSecurity;

                    if (self.action == 'DISPOSE') {
                        self.inputElem.setAttribute("contenteditable", false);
                        self.onDispose();
                    } else if (self.action == 'ABORT') {
                        self.inputElem.setAttribute("contenteditable", false);
                        self.onAbort();

                    } else {
                        requestData();
                    }
                } else {
                    console.log("xhr.onreadystatechange: readyState = " + xhr.readyState + ", status = " + xhr.status);
                    setTimeout(requestData, 2000);
                }
            }
        };
        var rnd = generateUUID();
        xhr.open("GET", "/textTerminalData?rnd=" + rnd, true);
        xhr.setRequestHeader("uuid", self.uuid);
        xhr.send(null);
    }

    var postInput = function(userInterrupt) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/textTerminalInput", true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("uuid", self.uuid);

        var input = self.inputElem.textContent;

        if(userInterrupt) {
            console.log("User interrupt!");
            xhr.setRequestHeader("textio-user-interrupt", "true");
        } else {
            createNewTextTermPair("<br/>");
        }
        self.inputElem.focus();
        xhr.send(input);
    }

    var createNewTextTermPair = function(initialInnerHTML) {
        newParentElem = self.inputElem.parentNode.cloneNode(true);
        if(self.inputElem.textContent) {
            self.inputElem.setAttribute("contenteditable", false);
        } else {
            self.inputElem.parentNode.removeChild(self.inputElem);
        }

        self.inputElem = newParentElem.querySelector(".textterm-input");
        self.inputElem.style.color = self.settings.inputColor || null;
        self.inputElem.style.backgroundColor = self.settings.inputBackgroundColor || null;
        self.inputElem.style.fontWeight = (self.settings.inputBold) ? 'bold' : null;
        self.inputElem.style.fontStyle = (self.settings.inputItalic) ? 'italic' : null;
        self.inputElem.style.textDecoration = (self.settings.inputUnderline) ? 'underline' : null;
        self.inputElem.className = "textterm-input";
        if(self.settings.inputStyleClass) {
            self.inputElem.classList.add(self.settings.inputStyleClass);
        }
        self.inputElem.textContent = "";

        self.promptElem = newParentElem.querySelector(".textterm-prompt");
        self.promptElem.style.color = self.settings.promptColor || null;
        self.promptElem.style.backgroundColor = self.settings.promptBackgroundColor || null;
        self.promptElem.style.fontWeight = (self.settings.promptBold) ? 'bold' : null;
        self.promptElem.style.fontStyle = (self.settings.promptItalic) ? 'italic' : null;
        self.promptElem.style.textDecoration = (self.settings.promptUnderline) ? 'underline' : null;
        self.promptElem.className = "textterm-prompt";
        if(self.settings.promptStyleClass) {
            self.promptElem.classList.add(self.settings.promptStyleClass);
        }
        self.promptElem.textContent = "";
        if(initialInnerHTML) {
            self.promptElem.innerHTML = initialInnerHTML;
        }

        if(self.settings.paneBackgroundColor) {
            self.textTermElem.style.backgroundColor = self.settings.paneBackgroundColor;
        }
        if(self.settings.paneStyleClass) {
            self.textTermElem.className = "textterm-pane";
            self.textTermElem.classList.add(self.settings.paneStyleClass);
        }

        self.textTermElem.appendChild(newParentElem);
    }

    var isUserInterruptKey = function(event) {
        var key = event.which || event.keyCode || 0;
        if(key != self.settings.userInterruptKeyCode) return false;
        if(event.ctrlKey != self.settings.userInterruptKeyCtrl) return false;
        if(event.shiftKey != self.settings.userInterruptKeyShift) return false;
        if(event.altKey != self.settings.userInterruptKeyAlt) return false;

        return true;
    }

    var initSettings = function() {
        self.settings = {};

        self.settings.userInterruptKeyCode = 'Q'.charCodeAt(0);
        self.settings.userInterruptKeyCtrl = true;
        self.settings.userInterruptKeyShift = false;
        self.settings.userInterruptKeyAlt = false;

        self.settings.promptStyleClass = "";
        self.settings.promptColor = "";
        self.settings.promptBackgroundColor = "";
        self.settings.promptBold = false;
        self.settings.promptItalic = false;
        self.settings.promptUnderline = false;

        self.settings.inputStyleClass = "";
        self.settings.inputColor = "";
        self.settings.inputBackgroundColor = "";
        self.settings.inputBold = false;
        self.settings.inputItalic = false;
        self.settings.inputUnderline = false;

        self.settings.paneStyleClass = "";
        self.settings.paneBackgroundColor = "";
    }

    var applySettings = function(settings) {
        var count = settings.length;
        for (i = 0; i < count; i++) {
            var key = settings[i].key;
            var value = settings[i].value;
            self.settings[key] = value;
            console.log("settings: " + key + " = " + value);
        }
        return count;
    }

    self.init = function(textTermElem) {
        self.uuid = generateUUID();
        initSettings();

        self.textTermElem = textTermElem;
        self.inputElem = textTermElem.querySelector(".textterm-input");
        self.promptElem = textTermElem.querySelector(".textterm-prompt");

        self.onDispose = function() {
            console.log("onDispose: default empty implementation");
        }

        self.onAbort = function() {
            console.log("onAbort: default empty implementation");
        }

        textTermElem.addEventListener("keyup", function(event) {
            if(historyIndex < 0) return;
            browseHistory(event.target, event.keyCode);
        });

        textTermElem.addEventListener("keydown", function(event) {
            if(isUserInterruptKey(event)) {
                postInput(true);
                event.preventDefault();
            }
        });

        textTermElem.addEventListener("keypress", function(event) {
            var key = event.which || event.keyCode || 0;
            if(key != 13) return false;
            if(self.action != "READ_MASKED") {
                updateHistory(self.inputElem.textContent);
            }
            postInput(false);
            event.preventDefault();
        });

        requestData();

        return self;
    };

    return self;
})();