// 从 localStorage 读取语言设置，与主题持久化机制一致
let currentLang = localStorage.getItem('language') || 'zh';
let translations = {};

// 提前设置 html lang 属性，供其他脚本读取
document.documentElement.lang = currentLang;

function getBasePath() {
    // 详情页在 /pages/ 目录下，需要返回上一级
    return window.location.pathname.includes('/pages/') ? '../' : '';
}

function initI18n() {
    // 同步语言切换按钮初始状态
    const switcher = document.getElementById('language-switcher');
    if (switcher) {
        switcher.textContent = currentLang === 'zh' ? 'EN' : 'CH';
    }
    
    loadLanguage(currentLang, () => {
        initLanguageSwitcher();
        translatePage();
    });
}

function loadLanguage(lang, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${getBasePath()}data/locales/${lang}.json`, true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                translations = JSON.parse(xhr.responseText);
                if (callback) callback();
            } catch (error) {
                console.error('Failed to parse language file:', error);
                translations = {};
                if (callback) callback();
            }
        } else {
            console.error(`Failed to load language ${lang}: ${xhr.status}`);
            translations = {};
            if (callback) callback();
        }
    };
    xhr.onerror = function() {
        console.error(`Network error loading language ${lang}`);
        translations = {};
        if (callback) callback();
    };
    xhr.send();
}

function initLanguageSwitcher() {
    const switcher = document.getElementById('language-switcher');
    if (switcher) {
        // 避免重复绑定
        switcher.replaceWith(switcher.cloneNode(true));
        const newSwitcher = document.getElementById('language-switcher');
        newSwitcher.textContent = currentLang === 'zh' ? 'EN' : 'CH';
        newSwitcher.addEventListener('click', function() {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            // 持久化语言设置
            localStorage.setItem('language', currentLang);
            // 同步 html lang 属性
            document.documentElement.lang = currentLang;
            newSwitcher.textContent = currentLang === 'zh' ? 'EN' : 'CH';
            switchLanguage(currentLang);
        });
    }
}

function switchLanguage(lang) {
    loadLanguage(lang, function() {
        translatePage();
        const event = new CustomEvent('languageChange', { detail: lang });
        window.dispatchEvent(event);
    });
}

function translatePage() {
    translateElements('[data-i18n]');
    translateElements('[data-i18n-placeholder]', 'placeholder');
    translateElements('[data-i18n-title]', 'title');
}

function translateElements(selector, attribute) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(function(element) {
        const attrName = attribute ? selector.replace(/\[|\]/g, '') : 'data-i18n';
        const key = element.getAttribute(attrName);
        const translation = getTranslation(key);
        
        if (translation) {
            if (attribute) {
                element.setAttribute(attribute, translation);
            } else {
                element.textContent = translation;
            }
        }
    });
}

function getTranslation(key) {
    if (!key || !translations) return '';
    
    const keys = key.split('.');
    let result = translations;
    
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            return '';
        }
    }
    
    return typeof result === 'string' ? result : '';
}

// 暴露全局函数供其他脚本获取当前语言
function getCurrentLang() {
    return currentLang;
}
window.getCurrentLang = getCurrentLang;

document.addEventListener('DOMContentLoaded', initI18n);
