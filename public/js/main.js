function get_cookie(name){
    arrayCookie=(document.cookie).split(';');
    for (let index = 0; index < arrayCookie.length; index++) {
        if (arrayCookie[index].indexOf(name)!=-1) {
            return {name : decodeURI(arrayCookie[index].split('=')[0]), value : decodeURI(arrayCookie[index].split('=')[1])};
        }
    }
}

function formatName(str){
    let formattedString = (str.charAt(0)).toUpperCase()+(str.substring(1)).toLowerCase();
    return formattedString;
}


// Custom helper functions 

function genHex(length){
    length = length || 16;
    let counter = 0;
    let generated_hex = "t";
    let characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    while(counter <= length){
        let rand_index = Math.round((Math.random()*characters.length)+1);
        generated_hex += characters.charAt(rand_index);
        counter += 1;
    }
    return generated_hex;
}

function get(selector) {
    return document.getElementById(selector);
}

function forEach(elements, reaction){
    for(let i = 0; i < elements.length; i++){
        (reaction)(elements[i]);
    }
}


function create(element) {
    return document.createElement(element);
}

function createText(text) {
    return document.createTextNode(text);
}

function createComponent(type, value) {
    value = value || null;
    const component = document.createElement(type);
    if (value){
        text = document.createTextNode(value);
        component.appendChild(text);
    }
    return component;
}

const joinComponent = function(container, ...components) {
    for (let component of components){
        container.appendChild(component);
    }
    return container;
};