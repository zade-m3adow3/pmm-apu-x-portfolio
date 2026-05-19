const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('public/Instructions.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('public/Instructions.txt', data.text);
    console.log("Extracted text. Length: " + data.text.length);
});
