module.exports = {
    //匹配字符串中特定的背景图引用规则，匹配非2倍图
    pngRegex : /^\s*url\(.*slice(\/|\\).+\.png\)$/i,
    jpgRegex : /^\s*url\(.*slice(\/|\\).+\.jpg\)$/i,
};
