const receiver = function(e) {
    console.log(e);
};

self.addEventListener("message", receiver);