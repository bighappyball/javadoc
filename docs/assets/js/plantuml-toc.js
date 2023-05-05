


"use strict";
var defaultOptions = {
  headings: 'h1,h2,h3,h4,h5',
  isOpen: false
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


var getPlantumlHeaders = function (baseSelect, headings) {

  var titles = headings.split(",");
  var selector = ''
  for (var i = 0; i < titles.length; i++) {
    if (i === titles.length - 1) {
      selector += baseSelect + ' ' + titles[i]
    } else {
      selector += baseSelect + ' ' + titles[i] + ',';
    }
  }
  // console.log(selector)
  var allHeadings = document.querySelectorAll(selector);
  var ret = [];

  [].forEach.call(allHeadings, function (heading) {
    ret = ret.concat(heading);
  });

  return ret;
};

var getPlantumlLevel = function (header) {
  var decs = header.match(/\d/g);

  return decs ? Math.min.apply(null, decs) : 1;
};


var handleUrl = function (url) {
  // 转小写
  url = url.toLowerCase();
  // 空格转-
  url = url.replace(" ", '-')
  // ()
  url = url.replace("(", "").replace(")", "")
  return url
}



var buildPlantumlToc = function (options) {
  var ret = document.createElement('div');
  // var height=options.height?options.height:1000;
  var width = options.width ? options.width : 900;
  var skin = options.skin ? options.skin : "cerulean-outline"
  // scale ${height} height\n scale ${width} width\n
  var data = `@startmindmap\n  !theme ${skin}\n`
  var headers = getPlantumlHeaders(`.markdown-section`, options.headings).filter(h => h.id);
  var baseURL = window.location.href.split("?", 1)[0]
  var levels = new Array(10).fill(0)

  headers.reduce(function (prev, curr, index) {
    var currentLevel = getLevel(curr.tagName);
    var autoHeaderText = '';
    levels[currentLevel - 1]++
    if (prev > currentLevel) {
      for (var i = currentLevel; i < levels.length; i++) {
        levels[i] = 0;
      }
    }
    for (var j = 0; j < currentLevel; j++) {
      data += '+';
      autoHeaderText += `${levels[j]}`
      if (j != currentLevel - 1) {
        autoHeaderText += '.'
      }
    }

    data += `_ [[${baseURL}?id=${handleUrl(curr.innerText.toLowerCase())} ${autoHeaderText}]] ${curr.innerText}\n`
    // data += `_ <color:black>${curr.innerText}</color>\n`
    // console.log(curr.innerHTML)
    curr.innerHTML = curr.innerHTML.replace(`<span>${curr.innerText}</span>`, `<span>${autoHeaderText + ' ' + curr.innerText}</span>`)
    // curr.outerText= autoHeaderText+curr.outerText
    return currentLevel;
  }, getPlantumlLevel(options.headings));
  data += ` @endmindmap`
  var eleStr = `<p data-lang="plantuml">${compress(data)}</p>`
  ret.innerHTML = eleStr
  return ret;
};


// Docsify plugin functions
function plugin(hook, vm) {
  var userOptions = vm.config.plantumltoc;

  hook.mounted(function () {
    var content = window.Docsify.dom.find(".content");
    if (content) {

      var plantumltoc = window.Docsify.dom.create("div", "");
      plantumltoc.id = "plantuml-toc"
      window.Docsify.dom.before(content, plantumltoc);

      // var plantumlcontrol = window.Docsify.dom.create("div", "");
      // plantumlcontrol.id = "plantuml-control"
      // plantumlcontrol.onclick=activeClass
      // window.Docsify.dom.appendTo(plantumltoc, plantumlcontrol);
      // var plantumlresize = window.Docsify.dom.create("div", "");
   
      // plantumlresize.className="g-resize"
      // window.Docsify.dom.appendTo(plantumlcontrol, plantumlresize);
      // var plantumlcontent = window.Docsify.dom.create("div", "");
      // plantumlcontent.className="g-content"
      // window.Docsify.dom.appendTo(plantumlcontrol, plantumlcontent);
      
      // plantumlcontrol.innerHTML="<span>目录</span>"
      // plantumlcontrol.onclick = activeClass;


      var plantumlcontent = window.Docsify.dom.create("div", "");
      plantumlcontent.id = "plantuml-content"
      window.Docsify.dom.appendTo(plantumltoc, plantumlcontent);

      // var plantumlGoTop = window.Docsify.dom.create("span", "<i class='fas fa-arrow-up'></i>");
      // plantumlGoTop.id = "plantuml-toc-gotop";
      // plantumlGoTop.onclick = goTopFunction;
      // window.Docsify.dom.before(mainElm, plantumlGoTop);
    }
  });

  hook.doneEach(function () {
    var plantumltoc = document.getElementById('plantuml-content');
    if (!plantumltoc) {
      return;
    }
    plantumltoc.innerHTML = null
    const toc = buildPlantumlToc(userOptions);

    if (!toc.innerHTML) {
      return;
    }

    plantumltoc.appendChild(toc);
  });
}

// // Docsify plugin options
window.$docsify['plantuml-toc'] = Object.assign(defaultOptions, window.$docsify['plantuml-toc']);
window.$docsify.plugins = [].concat(plugin, window.$docsify.plugins);
