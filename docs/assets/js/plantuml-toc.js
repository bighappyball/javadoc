


"use strict";
var defaultOptions = {
  headings: 'h1, h2, h3,h4,h5',
}


function compress(s) {
  //UTF8
  s = unescape(encodeURIComponent(s));
  var arr = [];
  for (var i = 0; i < s.length; i++) {
    arr.push(s.charCodeAt(i));
  }
  var compressor = new Zopfli.RawDeflate(arr);
  var compressed = compressor.compress();
  var dest = '<object type="image/svg+xml" data="//www.plantuml.com/plantuml/svg/' + encode64_(compressed) + '" />';
  return dest
}

var aTag = function (src) {
  var a = document.createElement('a');
  var content = src.firstChild.innerHTML;

  // 使用这个限制长度，未使用。
  // https://github.com/arendjr/text-clipper
  a.innerHTML = content;
  a.href = src.firstChild.href;

  a.onclick = activeClass;
  return a
};

var activeClass = function (e) {

  var divs = document.querySelectorAll('#plantuml-toc .active');

  // 删除之前的样式
  [].forEach.call(divs, function (div) {
    div.setAttribute('class', '')
  });

  // 给当前点击的项加入新的样式
  e.target.parentNode.setAttribute('class', 'active')
};





var getHeaders = function (selector) {
  var allHeadings = document.querySelectorAll(selector);
  var ret = [];

  [].forEach.call(allHeadings, function (heading) {
    ret = ret.concat(heading);
  });

  return ret;
};

var getLevel = function (header) {
  var decs = header.match(/\d/g);

  return decs ? Math.min.apply(null, decs) : 1;
};






var buildTOC = function (options) {
  var ret = document.createElement('p');
  var data = "@startmindmap\n !theme cerulean-outline\n scale 900 width\n"
  var selector = '.markdown-section ' + options.headings?options.headings:defaultOptions
  var headers = getHeaders(selector).filter(h => h.id);
  headers.reduce(function (prev, curr, index) {
    var currentLevel = getLevel(curr.tagName);
    for (var j = 0; j < currentLevel; j++) {
      data += '+';
    }
    data += "_ " + curr.innerText + "\n"
    return currentLevel;
  }, getLevel(options.headings));
  data += " @endmindmap"
  var eleStr = `<p data-lang="plantuml">${compress(data)}</p>`
  ret.innerHTML = eleStr
  return ret;
};

// var goTopFunction = function (e) {
//   e.stopPropagation();
//   var step = window.scrollY / 50;
//   var scroll = function () {
//     window.scrollTo(0, window.scrollY - step);
//     if (window.scrollY > 0) {
//       setTimeout(scroll, 10);
//     }
//   };
//   scroll();
// };

// Docsify plugin functions
function plugin(hook, vm) {
  var userOptions = vm.config.plantumltoc;

  hook.beforeEach(function () {
    var mainElm = document.querySelector("main");
    var content = window.Docsify.dom.find(".content");
    if (content) {
      var plantumltoc = window.Docsify.dom.create("div", "");
      plantumltoc.id = "plantuml-toc"
      window.Docsify.dom.before(mainElm, plantumltoc);

      // var plantumlGoTop = window.Docsify.dom.create("span", "<i class='fas fa-arrow-up'></i>");
      // plantumlGoTop.id = "plantuml-toc-gotop";
      // plantumlGoTop.onclick = goTopFunction;
      // window.Docsify.dom.before(mainElm, plantumlGoTop);
    }
  });

  hook.doneEach(function () {
    var plantumltoc = document.getElementById('plantuml-toc');
    if (!plantumltoc) {
      return;
    }
    plantumltoc.innerHTML = null

    // var TocAnchor = document.createElement('i');
    // TocAnchor.setAttribute('class', 'fas fa-list');
    // plantumltoc.appendChild(TocAnchor);

    const toc = buildTOC(userOptions);

    if (!toc.innerHTML) {
      return;
    }

    plantumltoc.appendChild(toc);
  });
}

// Docsify plugin options
window.$docsify['plantuml-toc'] = Object.assign(defaultOptions, window.$docsify['plantuml-toc']);
window.$docsify.plugins = [].concat(plugin, window.$docsify.plugins);
