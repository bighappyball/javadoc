/*
 * docsify-autoHeaders.js v4.1.0
 * (https://markbattistella.github.io/docsify-autoHeaders/)
 * Copyright (c) 2021 Mark Battistella (@markbattistella)
 * Licensed under MIT
 */
"use strict";
function _typeof(e) {
    return (_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
        return typeof e
    }
    : function(e) {
        return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
    }
    )(e)
}
var autoHeaderOptions = {
    separator: "",
    custom: "",
    levels: "",
    scope: "",
    debug: !1
};
function getAutoHeadersOptions(e) {
    if (!e.separator || !e.levels || !e.scope)
        return console.error("ERROR: config settings not set");
    var t = "other" == e.separator ? e.custom || "_" : "";
    switch (e.separator) {
    case "decimal":
        t = ".";
        break;
    case "dash":
        t = "-";
        break;
    case "bracket":
        t = ")";
        break;
    case "other":
        break;
    default:
        return
    }
    return [t, e.levels || 6, e.scope || "main", !0 === e.debug]
}
function autoHeaders(e, t) {
    debugger
    var u, r, f, o, p, d, y;
    void 0 !== getAutoHeadersOptions(autoHeaderOptions) && (u = null,
    r = getAutoHeadersOptions(autoHeaderOptions),
    f = r[0],
    o = r[1],
    p = r[2],
    d = r[3],
    y = function(e) {
        var t = "";
        if ("string" == typeof o)
            t = "H1-".concat(e);
        else if ("object" === _typeof(o) && null !== o) {
            if (e.start > e.finish)
                return console.log("ERROR: heading start level cannot be greater than finish level");
            if (e.start < 1 || 6 < e.start || e.finish < 1 || 6 < e.finish)
                return console.log("ERROR: heading levels need to be between 1-6");
            t = "H".concat(e.start, "-").concat(e.finish)
        }
        return t
    }(o),
    e.beforeEach(function(e) {
        if ("@autoHeader:" === e.slice(0, 12)) {
            var t = e.split("\n")[0];
            return u = !(u = t.split(":")[1]) || null == u || "" == u || 6 < (u = u.split(f)).length ? null : u.concat(new Array(6).fill(0)).slice(0, 6).map(function(e) {
                return +e
            }),
            e.replace(t, "")
        }
        u = null
    }),
    e.doneEach(function() {
        var e = document.querySelector(p);
        if (!e && d)
            return console.error('ERROR: the "scope" entry is not valid');
        if (null === u)
            return d ? console.error('ERROR: the "start" number is empty or null') : "";
        if (u.every(isNaN))
            return d ? console.error("ERROR: the values provided are not numeric") : "";
        var t = e.querySelectorAll("h1, h2, h3, h4, h5, h6");
        if (!u.every(function(e) {
            return 0 <= e
        }))
            return d ? console.error("ERROR: the values are not positive integers") : "";
        var r, o = [0, u[0] - 1, u[1] - 1, u[2] - 1, u[3] - 1, u[4] - 1, u[5] - 1], n = [!0, !0, !0, !0, !0, !0, !0];
        for (r in t) {
            var a = t[r]
              , s = ""
              , i = new RegExp("^H([".concat(y, "])$"));
            if (a && a.tagName && a.tagName.match(i)) {
                var c = RegExp.$1;
                o[c]++,
                n[c] || function(e) {
                    for (var t = +e + 1; t <= 6; t++)
                        o[t] = 0
                }(c),
                n[c] = !1;
                for (var l = 1; l <= 6; l++)
                    l <= c && (s += o[l] + f);
                a.innerHTML = s + " " + a.innerHTML.replace(/^[0-9\.\s]+/, "")
            }
        }
    }))
}
window.$docsify.autoHeaders = Object.assign(autoHeaderOptions, window.$docsify.autoHeaders),
window.$docsify.plugins = [].concat(autoHeaders, window.$docsify.plugins);
