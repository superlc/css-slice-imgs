var fs = require('fs');
var path = require('path');
var CssCleaner = require('clean-css');
var BackgroudnRegex = require('./regex.js');
var cssom = require('cssom');

function CssSliceImgs(){}
CssSliceImgs.prototype = {
    getImages : function(cssFile,config,callback){
        var _this = this;
        //��ȡָ��css�ļ���ͼƬ�ļ���·��
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
                    //�����������ʽ�ļ���·�������Ϣ
                    var relativePath = path.parse(cssFile);

                    //var content = data.toString('utf8');
                    //����ȡ����ʽ�ļ����ݽ��д���1��ɾ������ע�ʹ��룻
                    //ֱ�ӽ���ʽ�ļ����ڵ�Ŀ¼ȷ��Ϊ��Ŀ¼����Ϊ����clean-css���ԣ���Ѱ����ʽ�ļ��Ļ�׼������
                    var r_path = path.dirname(cssFile);
                    //��һ��һ��Ҫ�ǳ�ע��ĵط��������Ҫcssmin����import�Ļ�����һ��Ҫ������ȷ��relativeTo����
                    var content = new CssCleaner({
                        keepSpecialComments : 0,
                        aggressiveMerging : false,
                        restructuring : false,//�������Ժϲ������Ľṹ���飬�����ֹ�������Ժϲ����Ҹ���ԭ�нṹ
                        keepBreaks : true,
                        relativeTo : r_path,
                        rebase : false
                    }).minify(data).styles;
                    /**
                     * ������ر���
                     * */
                    //png����ر���
                    var pngsPath = [];
                    var pngMaps = {};
                    var pngsPath2x = [];
                    var pngMaps2x = {};

                    //jpg����ر���
                    var jpgsPath = [];
                    var jpgMaps = {};
                    var jpgsPath2x = [];
                    var jpgMaps2x = {};

                    //������������ʽ�ļ��ַ���������ȡ��ʽ�����
                    var parseResult = cssom.parse(content).cssRules;
                    var prCount = parseResult.length;
                    //css object model��������Ľ������һ�δ���
                    var ret = [];
                    //�û��ж϶Ծ���·������ȥ��
                    var obj = {};
                    var relativeDir = path.dirname(cssFile);

                    //���췵�����ݣ�����cssom���������������ͼƬ����ɸѡ�Ľ��
                    for(var i = 0;i < prCount; i++){
                        //ȡ��������Ķ����style����ֵ�������и�ֵ����
                        var styles = parseResult[i].style;
                        var tmp = {
                            selector : parseResult[i].selectorText,
                            rules : {}
                        };
                        //�ڽ�������@����ʱ�ᱨ�������һ���жϣ����styles���ڲŴ���
                        if(styles && styles.hasOwnProperty('length')){
                            for(var j = 0 ; j < styles.length ; j++){
                                //����
                                tmp.rules[styles[j]] = styles[styles[j]];
                                //����slice�Ĺ���
                                if(styles[j] === 'background-image' && BackgroudnRegex.pngRegex.test(styles[styles[j]])) {
                                    //�����Ƿ�Ҫѩ��ͼ�ı�־
                                    tmp.isSprite = true;
                                    //��ȡ����ͼƬ��ʵ�ʵ�ַ
                                    /**
                                     * url ��Ϊ3�����
                                     * 1����������
                                     * 2����˫����
                                     * 3����������
                                     * */
                                    var url = styles[styles[j]].replace(/^\s*url\(/, '').replace(')', '').replace(/"/g,'').replace(/'/g,'');
                                    var realPath = path.resolve(relativeDir, url);
                                    //console.log(realPath);
                                    //�þ���·����δ���������·������
                                    if (obj[realPath] === undefined) {
                                        //��������ӱ�־
                                        obj[realPath] = true;
                                        //�ж��Ƿ�Ϊ2��ͼ
                                        if (styles[styles[j]].indexOf('@2x.png') >= 0) {
                                            //�þ��Ե�ַ��ӵ�����·������
                                            pngsPath2x.push(realPath);
                                            //�ø�ѡ����ָ���Ӧ�ľ���·�����Ա���������ꡢsize�Ƚ��д���
                                            pngMaps2x[parseResult[i].selectorText] = realPath;
                                        }else{
                                            //��ӵ�����ͼ
                                            pngsPath.push(realPath);
                                            pngMaps[parseResult[i].selectorText] = realPath;
                                        }
                                    }else {
                                        if (styles[styles[j]].indexOf('@2x.png') >= 0){
                                            //����þ��Ե�ַ�Ѿ���ӵ����Ե�ַ·�������У��򲻼�����ӣ�ֻ��Ҫ����Ӧ��ѡ����ָ��þ���·������
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
                        buffer : data,//�����ļ���ȡ��Ķ�����
                        basename : path.basename(cssFile,'.css'),
                        status : true,
                        rules : ret,//������Ĺ���
                        fileContent : content,
                        pngPathes : pngsPath,//���Ե�ַ�ļ�������
                        pngMaps : pngMaps,//���Ե�ַ=����ѡ����
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
     * ʹ���ֵ�����ݽṹ���ӿ�����ȥ��
     * */
    _merge : function(imgs,imgsPath,imgsObj,imgMaps,relativePath){
        var count = imgs.length;
        for(var j = 0;j < count;j++){
            //ʹ��key-value����ʽ���жϸ������Ƿ������ù�
            if(!imgsObj[imgs[j]]){
                //��ȡ����·��
                var realImgPath = path.resolve(relativePath.dir,imgs[j].replace(/background-image\s*:\s*url\(/,'').replace(')',''));
                //���˺��ͼƬ����·��
                imgsPath.push(realImgPath);
                imgsObj[imgs[j]] = true;
                imgMaps[realImgPath] = imgs[j];
            }
        }
    },
    /**
     * ���鿽����������ͼ��˫��ͼ���з���
     * */
    _seperate : function (totalPath,totalMap,typePath,typeMap,typePath2x,typeMap2x) {
         //���˺��ͼƬ����·������
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