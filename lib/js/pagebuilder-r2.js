/**
 * Created by msyk on 14/12/29.
 * 
 */

var pageContents, pageContentsLowerCase, idx;
window.onload = function() {
    "use strict";
    INTERMediator.titleAsLinkInfo = false;
    var wrapNode, node, wrapNodeRepeater, i;
    var language = "en";
    var urlComp = window.location.href.split("/");
    for (i = urlComp.length - 1; i >= 0; i--) {
        if (urlComp[i].length < 3 && urlComp[i].length > 0) {
            language = urlComp[i];
            break;
        }
    }
    INTERMediator.addCondition("pagebuilder", { field: "language", operator: "=", value: language });
    INTERMediator.addCondition("newslist", { field: "language", operator: "=", value: language });

    var bodyNode = document.getElementsByTagName("BODY")[0];
    var firstLevelChildren = [];
    while (bodyNode.childNodes.length > 0) {
        firstLevelChildren.push(bodyNode.childNodes[0]);
        bodyNode.removeChild(bodyNode.childNodes[0]);
    }

    wrapNode = document.createElement("DIV");
    wrapNode.setAttribute("id", "_im_pb_PageWrapper");
    wrapNode.setAttribute("data-im-control", "enclosure");
    wrapNode.className = "_im_pb_WrapNodeEnclosure";
    wrapNode.addEventListener("click", function() {}, false); // hide mobile menu
    bodyNode.appendChild(wrapNode);

    wrapNodeRepeater = document.createElement("DIV");
    wrapNodeRepeater.setAttribute("data-im-control", "repeater");
    wrapNodeRepeater.className = "_im_pb_WrapNodeRepeater";
    wrapNode.appendChild(wrapNodeRepeater);

    // node = document.createElement("NAV");
    // node.setAttribute("data-im", "pagebuilder@pagenavigation@innerHTML");
    // node.className = "_im_pb_PageNavigation";
    // wrapNodeRepeater.appendChild(node);

    node = document.createElement("DIV");
    node.setAttribute("data-im", "pagebuilder@pageheader@innerHTML");
    node.className = "_im_pb_PageHeader";
    wrapNodeRepeater.appendChild(node);

    for (i = 0; i < firstLevelChildren.length; i++) {
        wrapNodeRepeater.appendChild(firstLevelChildren[i]);
    }

    node = document.createElement("DIV");
    node.setAttribute("data-im", "pagebuilder@pagefooter@innerHTML");
    node.className = "_im_pb_PageFooter";
    wrapNodeRepeater.appendChild(node);

    INTERMediatorOnPage.doAfterConstruct = function() {

        // タイトルとブレッドクラムのセット
        getSiteMap(language);

        if (document.getElementById("updatedate")) {
            var docDT = new Date(document.lastModified);
            document.getElementById("updatedate").appendChild(document.createTextNode(docDT.toLocaleDateString()));
        }
        if (document.getElementById("thisyear")) {
            var today = new Date();
            document.getElementById("thisyear").appendChild(document.createTextNode(today.getFullYear()));
        }
        localNavSetup();
        showHideNavArrow();
        gotoTop();

        // キーワード検索
        if (document.getElementById('search') !== null) {
            document.getElementById('search').addEventListener('click', search, false);
            // document.getElementById('searchInput').addEventListener('change', search, false);
            document.getElementById('searchInput').addEventListener("keypress", function(e) {
                if (e.keyCode === 13) {
                    search();
                    e.preventDefault();
                }
            }, false);
        }
    }
    createIndexForDocs();
    stickySidebar();
    INTERMediator.construct(true);
};

function search() {
    var word = document.getElementById('searchInput').value;
    if (word !== '') {
        document.activeElement.blur();
        var wordLowerCase = word.toLowerCase();
        // 検索結果表示要素の初期化
        var el = document.getElementById('searchResult');
        if (el !== null) {
            el.parentNode.removeChild(el);
        }
        // メッセージの表示
        document.getElementById('searchResultHeader').textContent = "検索中です。少々お待ち下さい...";
        // グローバル変数であるidxを利用して2回目以降の検索を高速化
        if (typeof idx !== 'undefined') {
            // 検索実行
            var r = idx.search(wordLowerCase);
            showResult(r);
            return;
        }
        // Load JSON
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../lib/ja/pageContents.js', true);
        xhr.onload = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    pageContents = JSON.parse(xhr.responseText); // global
                    pageContentsLowerCase = JSON.parse(xhr.responseText.toLowerCase()); // global
                    /* init lunr */
                    lunr.tokenizer = lunr.jp.tokenizer;
                    idx = lunr(function() { // global
                        // use the language
                        this.use(lunr.jp);
                        // then, the normal lunr index initialization
                        this.field('title', {
                            boost: 10
                        })
                        this.field('body')
                        this.ref('id')
                    });
                    /* add documents to index */
                    for (var i = 0; i < pageContentsLowerCase.length; i++) {
                        idx.add({
                            "title": pageContentsLowerCase[i].title,
                            "body": pageContentsLowerCase[i].body,
                            "id": pageContentsLowerCase[i].id
                        });
                    }
                    // 検索実行
                    var r = idx.search(wordLowerCase);
                    showResult(r);
                }
            } else {
                console.error(xhr.statusText);
                return false;
            }
        }
        xhr.onerror = function(e) {
            console.error(xhr.statusText);
        };
        xhr.send(null);
    }
}

function showResult(array) {
    var ref, score, ul, li, h4, p, link, line, span, header;
    // 検索結果表示エリアの調整
    if (array.length === 0) {
        document.getElementById('searchResultHeader').textContent = "検索結果は見つかりませんでした";
        return;
    }
    header = document.getElementById('searchResultHeader');
    span = document.createElement('SPAN');
    span.className = 'small';
    span.textContent = '（' + array.length + '件）';
    header.textContent = "検索結果";
    header.appendChild(span);
    ul = document.createElement('UL');
    ul.id = 'searchResult';
    ul.className = 'search-result';
    document.getElementById('searchResultBox').appendChild(ul);
    // 検索結果の表示
    for (var i = 0; i < array.length; i++) {
        li = document.createElement('LI');
        h4 = document.createElement('H4');
        p = document.createElement('P');
        link = document.createElement('A');
        ref = array[i].ref;
        score = array[i].score;
        line = pageContents.filter(function(item, index) {
            if (item.id == ref) return true;
        });
        p.textContent = (line[0].body === undefined) ? '' : line[0].body.slice(0, 300) + '...';
        link.href = line[0].path;
        link.textContent = line[0].title;
        link.target = '_blank';
        h4.appendChild(link);
        li.appendChild(h4);
        li.appendChild(p);
        ul.appendChild(li);
    }
}

function showDemoVideo() {
    "use strict";
    var win = window.open("../../demo2.html", null, "width=800,height=630,toolbar=no,location=no,directories=no,status=no");
}

function dropdownSetup() {
    "use strict";
}

function gotoTop() {
    "use strict";
    var el = document.createElement("a");
    el.className = "goto-top";
    el.href = "#top";
    document.body.appendChild(el);
    window.addEventListener("scroll", function() {
        var scrollTop = (document.body.scrollTop) ? document.body.scrollTop : document.documentElement.scrollTop;
        el.style.display = (scrollTop < 100) ? "none" : "block";
    }, false);
}

function pageIndexSetup() {
    "use strict";
    if (document.body.className === "docs") {
        var sectionId, li, a, index, heading, node;
        var parent = document.getElementById('pageIndex');
        heading = document.querySelectorAll("article section h1, article section h2");
        for (var i = 0; i < heading.length; i++) {
            sectionId = "section" + ("00" + i).slice(-3);
            heading[i].parentNode.id = sectionId;
            li = document.createElement("li");
            a = document.createElement("a");
            a.href = "#" + sectionId;
            a.title = heading[i].textContent;
            a.textContent = heading[i].textContent;
            li.appendChild(a);
            parent.appendChild(li);
        }
    }
}

function sidebarSetup() {
    "use strict";
    window.addEventListener("scroll", function() {
        var sticky = document.querySelectorAll(".sticky");
        for (var i = 0; i < sticky.length; i++) {
            var top = sticky[i].getBoundingClientRect().top;
            var scrollTop = (document.body.scrollTop) ? document.body.scrollTop : document.documentElement.scrollTop;
            if (scrollTop < 389) {
                sticky[i].style.position = "absolute";
                sticky[i].style.top = "";
            } else {
                sticky[i].style.position = "fixed";
                sticky[i].style.top = 0;
            }
        }
    }, false);
}

function localNavSetup() {
    "use strict";
    // 現在位置のハイライト
    var path = getDir(getCurrentPath());
    var pages = document.querySelectorAll(".local-nav ul li a");
    if (path === '/ja' || path === '/en') {
        pages[0].parentNode.className = "active";
    } else {
        for (var i = pages.length - 1; i >= 0; i--) {
            if (pages[i].href.indexOf(path) > 0) {
                pages[i].parentNode.className = "active";
            }
        }
    }
    // スマートフォン向け要素の追加
    var localNav = document.querySelector(".local-nav");
    var ul = document.querySelector(".local-nav ul");
    var arrowRight = document.createElement("DIV");
    var arrowLeft = document.createElement("DIV");
    arrowRight.textContent = ">";
    arrowLeft.textContent = "<";
    arrowRight.className = "nav-arrow nav-arrow-right";
    arrowLeft.className = "nav-arrow nav-arrow-left";
    arrowRight.addEventListener("click", tapNavArrow, false);
    arrowLeft.addEventListener("click", tapNavArrow, false);
    localNav.insertBefore(arrowRight, ul);
    localNav.insertBefore(arrowLeft, ul);
    localNav.addEventListener("touchend", showHideNavArrow, false);
    // Local function
    function getDir(str) {
        var without_hash = str.split(/#/)[0];
        return without_hash.substring(0, without_hash.lastIndexOf("/"));
    }
}

function showHideNavArrow() {
    "use strict";
    var ul = document.querySelector(".local-nav ul");
    var li = ul.querySelectorAll("li");
    var width = 0;
    for (var i = li.length - 1; i >= 0; i--) {
        width += li[i].getBoundingClientRect().width;
    }
    if (document.body.clientWidth > width) {
        return;
    } else {
        var navRight = document.querySelector(".nav-arrow-right");
        var navLeft = document.querySelector(".nav-arrow-left");
        navRight.style.display = (ul.getBoundingClientRect().right <= ul.getBoundingClientRect().width && ul.getBoundingClientRect().right < width && ul.getBoundingClientRect().left + width !== navRight.getBoundingClientRect().right) ? "block" : "none";
        navLeft.style.display = (ul.getBoundingClientRect().left < 0) ? "block" : "none";
    }
}

function tapNavArrow() {
    "use strict";
    var way, ul = document.querySelector(".local-nav ul"),
        className = this.className;
    if (className === "nav-arrow nav-arrow-right") {
        way = "right";
    } else if (className === "nav-arrow nav-arrow-left") {
        way = "left";
    }
}

/* For Documents */

function createIndexForDocs() {
    "use strict";
    if (document.body.className === "docs") {
        var sectionId, li, a, index, heading, node;
        var parent = document.getElementById('pageIndex');
        heading = document.querySelectorAll("article section h1, article section h2");
        for (var i = 0; i < heading.length; i++) {
            sectionId = "section" + ("00" + i).slice(-3);
            //heading[i].parentNode.id = sectionId;
            heading[i].id = sectionId;
            li = document.createElement("li");
            if ( heading[i].tagName == 'H2' ) {
                li.style.marginLeft = "30px";
            }
            a = document.createElement("a");
            a.href = "#" + sectionId;
            var s = '';
            for (var j = 0 ; j < heading[i].childNodes.length ; j++) {
                if ( heading[i][j].nodeType == 3 ) {
                    s += heading[i][j].textContent;
                }
            }
            a.title = s;
            a.textContent = s;
            li.appendChild(a);
            parent.appendChild(li);
        }
    }
}

function stickySidebar() {
    "use strict";
    window.addEventListener("scroll", function() {
        var sticky = document.querySelectorAll(".sticky");
        for (var i = 0; i < sticky.length; i++) {
            var top = sticky[i].getBoundingClientRect().top;
            var scrollTop = (document.body.scrollTop) ? document.body.scrollTop : document.documentElement.scrollTop;
            if (scrollTop < 389) {
                sticky[i].style.position = "absolute";
                sticky[i].style.top = "";
            } else {
                sticky[i].style.position = "fixed";
                sticky[i].style.top = 0;
            }
        }
    }, false);
}

// 現在のパスを取得
function getCurrentPath() {
    return location.pathname.replace(/\/index\.html/ig, '/');
}

// サイトマップの取得と
// タイトルとブレッドクラムのセット
function getSiteMap(language) {
    var url = '../../lib/' + language + '/sitemap.json';
    var xhr = new XMLHttpRequest();
    var method = 'GET';
    var async = true;
    xhr.open(method, url, async);
    xhr.onload = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                afterLoad(JSON.parse(xhr.responseText));
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.onerror = function() {
        console.error(xhr.statusText);
    };
    xhr.send(null);

    function afterLoad(sitemap) {

        // 現在のパスを取得
        var path = getCurrentPath();

        // ブレッドクラムの追加先要素
        var targetNode = getNodeOfBreadcrumb();

        if (path !== false) {
            // タイトルをセット
            setTitle(path);
            // ブレッドクラム要素の追加
            addBreadcrumb(path);
        }

        // サイトマップ項目からページ項目を取得する
        function getItemFromSitemap(path) {
            for (var i = 0; i < sitemap.length; i++) {
                if (path === sitemap[i].path) {
                    return sitemap[i];
                }
            }
            return false;
        }

        // タイトルタグと#pageTitleをセット
        function setTitle(path) {
            "use strict";
            var currentPageInfo = getItemFromSitemap(path);
            var suffix = ' - Product Manual - INTER-Mediator';
            if (document.getElementById('pageTitle') !== null) {
                document.getElementById('pageTitle').textContent = currentPageInfo.title;
            }
            document.title = currentPageInfo.title + suffix;
        }

        // ブレッドクラム要素の追加
        function addBreadcrumb(path) {
            if (targetNode !== false) {
                var currentPageInfo = getItemFromSitemap(path);
                addBreadcrumbItem(currentPageInfo); // 現在のブレッドクラム項目を追加
                if (currentPageInfo.parent !== null && typeof currentPageInfo.parent !== 'undefined') {
                    addBreadcrumb(currentPageInfo.parent);
                }
            }

            // 現在のブレッドクラム項目を追加
            function addBreadcrumbItem(item) {
                "use strict";
                var li = document.createElement('LI');
                if (item.path === getCurrentPath()) {
                    li.textContent = item.breadcrumb;
                } else {
                    var link = document.createElement('A');
                    link.href = item.path;
                    link.textContent = item.breadcrumb;
                    link.title = item.breadcrumb;
                    li.appendChild(link);
                }
                li.className = 'breadcrumb-item';
                targetNode.appendChild(li);
                targetNode.insertBefore(li, targetNode.children[0]);
            }

        }

        // 親項目ブレッドクラム要素の取得
        function getNodeOfBreadcrumb() {
            if (document.getElementById('breadcrumb') === null) {
                return false;
            } else {
                return document.getElementById('breadcrumb');
            }
        }

    }

}
