var path = require('path');
var fs = require('fs');
var jsdom = require('jsdom');

// 検索用JSONの作成
// http://inter-mediator.info/ja/ にて利用する

// サイトマップのロード
var currentDir = path.dirname(process.argv[1]);
var pages = require(path.resolve(currentDir + '/sitemap.json'));

// 検索に利用するJSONを作成
var filePath, text, doc;
var obj = {};
var data = [];
for (var i = 0; i < pages.length; i++) {

    // 読み込むHTMLファイルのパスを作成
    filePath = currentDir + '/../..' + pages[i].path;
    if (fs.statSync(filePath).isDirectory()) {
        filePath += 'index.html'; // ディレクトリの場合
    }
    absFilePath = path.resolve(filePath); // 絶対パスに変更
    console.log(absFilePath);

    // HTMLファイルのロード
    text = fs.readFileSync(absFilePath, 'utf8');

    // 読み込んだHTMLファイルをDOMに変換
    doc = jsdom.jsdom(text);

    // 指定したセレクタをチェック
    if (doc.querySelector('.container article') === null) {
        continue;
    }

    // 検索用JSONの作成
    obj = {
        "id": pages[i].id,
        "parent": pages[i].parent,
        "path": pages[i].path,
        "title": pages[i].title,
        "breadcrumb": pages[i].breadcrumb,
        "body": doc.querySelector('.container article').innerHTML.replace(/(<([^>]+)>)/ig, "")
    };
    data.push(obj);
}

// 整形して出力
fs.writeFile(path.resolve(currentDir + '/pageContents.js'), JSON.stringify(data, null, '    '));