const model = function() {
    // Import your modules here

    return {
        softEncrypt: function(password) {
            let encryptedpassword = password;
            // Write your encryption algorithm here, if neccessary.

            return encryptedpassword;
        },
        
        encrypt: function(password) {
            let encryptedpassword = password;
            // Write your encryption algorithm here, if neccessary.

            return encryptedpassword;
        },

        decrypt: function (encryptedpassword){
            let decryptedpassword = encryptedpassword;
            // Write your encryption algorithm here, if neccessary.

            return decryptedpassword;
        }
    };
};

module.exports = model();
