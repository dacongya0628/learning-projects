// 读取tokens配置
import {
    commonColorTokes,
    commonSizeToken,
    LHTokens,
    cssPrefixEnum,
    mediaQueryEnum
} from "./config.js";


/**
 * 将字典数据按照降序排序
 * @param {*} data 字典数据
 * @returns 
 */
function getSortedPrefixEntries(data) {
    return Object.entries(data).sort(([a], [b]) => b.length - a.length);
}
//排序后的css前缀字典枚举数据
const cssPrefixEnumEntries = getSortedPrefixEntries(cssPrefixEnum);

/**
 * 解析class类名
 * @param {*} initialClassName 传入的初始class类名
 * @returns initClassName 传入的初始class类名
 * @returns baseClassName 用于匹配字典的基础类名
 * @returns selectorSuffix 类型需要添加的伪类
 * @returns mediaQuery 外层包裹的媒体查询
 */
function resolveVariantContext(initialClassName) {
    // 有伪类的按照：符号分割
    const splitClassName = initialClassName.split(":");
    // 如果分割后数组长度为1，则表明没有伪类以及媒体查询可以直接返回
    if (splitClassName.length === 1) {
        return {
            initClassName: initialClassName,
            baseClassName: initialClassName,
            selectorSuffix: "",
            mediaQuery: ""
        };
    }
    const baseClassName = splitClassName.pop();
    let selectorSuffix = "";
    let mediaQuery = "";
    for (const prefix of splitClassName) {
        if (prefix === "hover") {
            selectorSuffix += ":hover";
            continue;
        }
        const mdBreak = mediaQueryEnum[prefix];
        if (mdBreak) {
            if (mediaQuery) return null;
            mediaQuery = `(max-width: ${mdBreak})`;
            continue;
        }
        return null
    }
    return {
        initialClassName,
        baseClassName,
        selectorSuffix,
        mediaQuery
    };
}

/**
 * 生成css规则
 * @param {*} baseClassName 
 * @param {*} selectorSuffix 
 * @returns 
 */
function generateRule(initialClassName, baseClassName, selectorSuffix) {
    // 从间距类字典里匹配对应的间距属性 例如 px-4 匹配px-
    const matchedDirection = cssPrefixEnumEntries.find(([prefix]) =>
        baseClassName.startsWith(`${prefix}-`)
    );
    // 如果没有匹配到就直接返回
    if (!matchedDirection) return null;

    // 解构匹配的属性值和类名前缀
    const [prefix, properties] = matchedDirection;
    // 获取类名的属性值作为Key匹配真实的token值
    const valueKey = baseClassName.slice(prefix.length + 1);
    // 根据key获取对应的token值
    const value = commonSizeToken[valueKey] || commonColorTokes[valueKey] || LHTokens[valueKey]
    console.log(valueKey,value)
    // 如果不存在对应的token直接返回
    if (!value) return null;
    // 遍历属性,类名可能对应多个属性 例如 px 对应 padding-left 和 padding-right
    const declarations = properties.map((property) => `${property}: ${value}`);
    // 格式化最终的属性数组数据
    return formatRule(initialClassName, declarations, selectorSuffix)
}

/**
 * 格式化样式属性
 * @param {*} baseClassName
 * @param {*} declarations 
 * @param {*} selectorSuffix 
 */
function formatRule(initialClassName, declarations, selectorSuffix) {
    const list = Array.isArray(declarations) ? declarations : [declarations];
    // 把每一条声明统一格式化成缩进后的 CSS 行。
    const cssBody = list.map((item) => `  ${item};`).join("\n");
    // 处理有伪类的class类名例如 hover:c-white
    const escapedClassName = escapeClassName(initialClassName);
    return `.${escapedClassName}${selectorSuffix} {\n${cssBody}\n}`;
}

/**
 * 处理有伪类的class类名例如 hover:c-white
 * @param {*} className 
 * @returns 
 */
function escapeClassName(className) {
    return className.replace(/:/g, "\\:");
}

/**
 * 处理需要媒体查询的class类
 * @param {*} rule 
 * @param {*} mediaQuery 
 * @returns 
 */
function wrapWithMediaQuery(rule, mediaQuery) {
    // 先把原规则整体向右缩进两格，这样它放进 @media 块之后，输出结果会更易读。
    const indentedRule = rule
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
    return `@media ${mediaQuery} {\n${indentedRule}\n}`;
}


// css生成器
export function generateCss(classNames) {
    // rules 用来保存最终生成成功的所有 CSS 规则。
    const rules = [];
    // unsupportedClassNames 用来保存当前还无法生成 CSS 的类名。
    const unsupportedClassNames = [];
    // 逐个处理扫描器返回的类名。
    for (const initialClassName of classNames) {
        const variantContext = resolveVariantContext(initialClassName);
        // 不支持的类名放入到未支持的数组中
        if (!variantContext) {
            unsupportedClassNames.push(initialClassName);
            continue;
        }
        const baseRule = generateRule(
            initialClassName,
            variantContext.baseClassName,
            variantContext.selectorSuffix
        );
        const rule = baseRule && variantContext.mediaQuery ? wrapWithMediaQuery(baseRule, variantContext.mediaQuery) : baseRule;
        if (rule) {
            rules.push(rule)
            continue;
        }
        unsupportedClassNames.push(initialClassName);
    }

    return {
        css: rules.join("\n\n"),
        unsupportedClassNames
    }
}
