var fs = require('fs');
var path = require('path');
var CssCleaner = require('clean-css');
var BackgroudnRegex = require('./regex.js');
var cssom = require('cssom');

function CssSliceImgs(){}
CssSliceImgs.prototype = {
    getImages : function(cssFile,config,callback){
        var _this = this;
        //获取指定css文件的图片文件的路径
        if(!fs.existsSync(cssFile)){
            callback({
                fName : cssFile,
                status : false,
                message : 'file not exist'
            });
        }else{
            fs.readFile(cssFile, function (err,data){
                if(err){
                    callback({
                        fName : cssFile,
                        status : false,
                        message : 'read file failed'
                    });
                }else{
                    //处理给定的样式文件的路径相关信息
                    var relativePath = path.parse(cssFile);

                    //var content = data.toString('utf8');
                    //将获取的样式文件内容进行处理：1、删除所有注释代码；
                    //直接将样式文件所在的目录确定为根目录，因为对于clean-css而言，它寻找样式文件的基准是这里
                    var r_path = path.dirname(cssFile);
                    //有一个一定要非常注意的地方：如果需要cssmin处理import的话，请一定要设置正确的relativeTo参数
                    var content = new CssCleaner({
                        keepSpecialComments : 0,
                        aggressiveMerging : false,
                        restructuring : false,//避免属性合并带来的结构重组，这里禁止进行属性合并，且更改原有结构
                        keepBreaks : true,
                        relativeTo : r_path,
                        rebase : false
                    }).minify(data).styles;
                    /**
                     * 声明相关变量
                     * */
                    //png的相关变量
                    var pngsPath = [];
                    var pngMaps = {};
                    var pngsPath2x = [];
                    var pngMaps2x = {};

                    //jpg的相关变量
                    var jpgsPath = [];
                    var jpgMaps = {};
                    var jpgsPath2x = [];
                    var jpgMaps2x = {};

                    //解析处理后的样式文件字符串，并获取样式结果集
                    var parseResult = cssom.parse(content).cssRules;
                    var prCount = parseResult.length;
                    //css object model，解析后的结果再做一次处理
                    var ret = [];
                    //用户判断对绝对路径进行去重
                    var obj = {};
                    var relativeDir = path.dirname(cssFile);

                    //构造返回数据，包括cssom解析结果及初步对图片进行筛选的结果
                    for(var i = 0;i < prCount; i++){
                        //取出解析后的对象的style属性值，并进行赋值保存
                        var styles = parseResult[i].style;
                        var tmp = {
                            selector : parseResult[i].selectorText,
                            rules : {}
                        };
                        //在解析遇到@符号时会报错，这里加一个判断，如果styles存在才处理
                        if(styles && styles.hasOwnProperty('length')){
                            for(var j = 0 ; j < styles.length ; j++){
                                //保存
                                tmp.rules[styles[j]] = styles[styles[j]];
                                //符合slice的规则
                                if(styles[j] === 'background-image' && BackgroudnRegex.pngRegex.test(styles[styles[j]])) {
                                    //设置是否要雪碧图的标志
                                    tmp.isSprite = true;
                                    //获取引用图片的实际地址
                                    /**
                                     * url 分为3种情况
                                     * 1、不带引号
                                     * 2、带双引号
                                     * 3、带单引号
                                     * */
                                    var url = styles[styles[j]].replace(/^\s*url\(/, '').replace(')', '').replace(/"/g,'').replace(/'/g,'');
                                    var realPath = path.resolve(relativeDir, url);
                                    //console.log(realPath);
                                    //该绝对路径还未添加至绝对路径数组
                                    if (obj[realPath] === undefined) {
                                        //设置已添加标志
                                        obj[realPath] = true;
                                        //判断是否为2倍图
                                        if (styles[styles[j]].indexOf('@2x.png') >= 0) {
                                            //该绝对地址添加到绝对路径数组
                                            pngsPath2x.push(realPath);
                                            //让该选择器指向对应的绝对路径，以便后续对坐标、size等进行处理
                                            pngMaps2x[parseResult[i].selectorText] = realPath;
                                        }else{
                                            //添加到单倍图
                                            pngsPath.push(realPath);
                                            pngMaps[parseResult[i].selectorText] = realPath;
                                        }
                                    }else {
                                        if (styles[styles[j]].indexOf('@2x.png') >= 0){
                                            //如果该绝对地址已经添加到绝对地址路径数组中，则不继续添加，只需要将对应的选择器指向该绝对路径即可
                                            pngMaps2x[parseResult[i].selectorText] = realPath;
                                        }else{
                                            pngMaps[parseResult[i].selectorText] = realPath;
                                        }
                                    }
                                    ret.push(tmp);
                                }
                            }
                        }
                    }
                    callback({
                        cssFile : cssFile,
                        buffer : data,//保留文件读取后的二进制
                        basename : path.basename(cssFile,'.css'),
                        status : true,
                        rules : ret,//解析后的规则
                        fileContent : content,
                        pngPathes : pngsPath,//绝对地址文件名数组
                        pngMaps : pngMaps,//绝对地址=》类选择器
                        jpgPathes : jpgsPath,
                        jpgMaps : jpgMaps,
                        pngPathes2x : pngsPath2x,
                        pngMaps2x : pngMaps2x,
                        jpgPathes2x : jpgsPath2x,
                        jpgMaps2x : jpgMaps2x
                    });
                }
            })
        }
    },
    /**
     * 使用字典的数据结构来加快数组去重
     * */
    _merge : function(imgs,imgsPath,imgsObj,imgMaps,relativePath){
        var count = imgs.length;
        for(var j = 0;j < count;j++){
            //使用key-value的形式来判断该引用是否已引用过
            if(!imgsObj[imgs[j]]){
                //获取绝对路径
                var realImgPath = path.resolve(relativePath.dir,imgs[j].replace(/background-image\s*:\s*url\(/,'').replace(')',''));
                //过滤后的图片绝对路径
                imgsPath.push(realImgPath);
                imgsObj[imgs[j]] = true;
                imgMaps[realImgPath] = imgs[j];
            }
        }
    },
    /**
     * 数组拷贝，将单倍图和双倍图进行分离
     * */
    _seperate : function (totalPath,totalMap,typePath,typeMap,typePath2x,typeMap2x) {
         //过滤后的图片绝对路径数组
         var count = totalPath.length;
         for(var i = 0;i < count;i++){
             if(totalPath[i].indexOf('@2x') >= 0){
                 typePath2x.push(totalPath[i]);
                 typeMap2x[totalPath[i]] = totalMap[totalPath[i]];
             }else{
                 typePath.push(totalPath[i]);
                 typeMap[totalPath[i]] = totalMap[totalPath[i]];
             }
         }
    }
};
module.exports = CssSliceImgs;