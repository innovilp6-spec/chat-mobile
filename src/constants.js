/**
 * UI Text constants for multilingual support on the Home screen.
 */
export const AppTexts = new Map();

AppTexts.set("English", {
    Home: {
        your_personal_help: "TCS Nayan",
        read: "Read",
        translate: "Translate",
        know_surrounding: "Know Surrounding",
        identify: "Identify",
        find: "Find",
        ai_assistant: "Ask Me",
    },
})

AppTexts.set("Hindi", {
    Home: {
        your_personal_help: "आपकी व्यक्तिगत मदद",
        read: "पढ़ें",
        translate: "अनुवाद करें",
        know_surrounding: "आस पास",
        identify: "पहचानें",
        find: "खोजें",
        ai_assistant: "एआई सहायक",
    }
})

/**
 * Core operation modes for the application's computer vision/audio features.
 */
export const OPERATIONS = {
    default: "none",
    know_surroundings: "know surroundings",
    read: "read",
    translate: "translate",
    identify: "identify",
    find: "find",
};

/**
 * Specific sub-tasks for each operation mode.
 */
export const SUB_OPERATIONS = {
    default: "none",
    browse_file: "browse_file",
    instant: "intant read",
    read_text: "read text",
    scan_read: "scan and read",
    handwritten_text: "read text",
    summarize: "summarize",
    people: "people",
    colors: "colors",
    currency: "currency",
};

/**
 * List of languages currently supported for translation and STT.
 */
export const supportedLangugaes = new Set(["hindi", "marathi", "bengali", "english", "gujarati", "punjabi", "tamil", "telugu", "malayalam", "bhojpuri"]);

/**
 * Mapping of language names to ISO language codes.
 */
export const languageMap = new Map();
languageMap.set("hindi", "hi");
languageMap.set("marathi", "mr");
languageMap.set("bengali", "bn");
languageMap.set("english", "en");
languageMap.set("gujarati", "gu");
languageMap.set("punjabi", "pa");
languageMap.set("tamil", "ta");
languageMap.set("telugu", "te");
languageMap.set("malayalam", "ml");
languageMap.set("bhojpuri", "bho");

/**
 * Registered screen names for the React Navigation stack.
 */
export const SCREENS = {
    home: "Home",
    camera: "Camera",
    result: "Result",
    languages: "Language",
    files: "Browse",
    menus: {
        read: "Read-Menu",
        identify: "Identify-Menu",
    },
    error: "Error",
    chat: "Chat"
}

/**
 * Regex patterns for input validation.
 */
export const REGEX = {
    special_characters: '^[^\/\\?%*:|"<>\]+$',
    no_leading_dots: '^[^.].*$',
    trim: '^\S.*\S$|^\S+$',
    printable_characters: '^[\w\-.\s]+$',
    consecutive_dots: '^(?!.*\.\.).+$',
    empty: '^\S+$',
}

