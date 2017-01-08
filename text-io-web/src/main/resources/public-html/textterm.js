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

    var requestData = function() {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
                var data = JSON.parse(xhr.responseText);
                var msgCount = data.messages.length;
                if(msgCount > 0) {
                    var newPrompt = "";
                    for (i = 0; i < msgCount; i++) {
                        newPrompt += data.messages[i];
                    }
                    self.promptElem.innerHTML += newPrompt;
                    self.inputElem.focus();
                }
                if(data.action != 'NONE') {
                    self.action = data.action;
                }
                var textSecurity = (self.action == 'READ_MASKED') ? "disc" : "none";
                self.inputElem.style["-webkit-text-security"] = textSecurity;
                self.inputElem.style["text-security"] = textSecurity;

                if(self.action == 'DISPOSE') {
                    self.inputElem.setAttribute("contenteditable", false);
                    self.onDispose();
                } else {
                    requestData();
                }
            }
        };
        var rnd = generateUUID();
        xhr.open("GET", "/textTerminalData?rnd=" + rnd, true);
        xhr.setRequestHeader("uuid", self.uuid);
        xhr.send(null);
    }

    var postInput = function() {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/textTerminalInput", true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("uuid", self.uuid);

        var input = self.inputElem.textContent;

        var newParentElem = self.inputElem.parentNode.cloneNode(true);
        self.inputElem.setAttribute("contenteditable", false);

        self.inputElem = newParentElem.querySelector(".textterm-input");
        self.inputElem.textContent = "";

        self.promptElem = newParentElem.querySelector(".textterm-prompt");
        self.inputText = "";
        self.promptElem.textContent = "";

        self.textTermElem.appendChild(newParentElem);
        self.inputElem.focus();

        xhr.send(input);
    }

    self.init = function(textTermElem) {
        self.uuid = generateUUID();

        self.textTermElem = textTermElem;
        self.inputElem = textTermElem.querySelector(".textterm-input");
        self.promptElem = textTermElem.querySelector(".textterm-prompt");

        self.onDispose = function() {
            console.log("onDispose: default empty implementation");
        }

        textTermElem.addEventListener("keyup", function(event) {
            if(historyIndex < 0) return;
            browseHistory(event.target, event.keyCode);
        });

        textTermElem.addEventListener("keypress", function(event) {
            if(event.keyCode != 13) return false;
            if(self.action != "READ_MASKED") {
                updateHistory(self.inputElem.textContent);
            }

            postInput();
            event.preventDefault();
        });

        requestData();

        return self;
    };

    return self;
})();
