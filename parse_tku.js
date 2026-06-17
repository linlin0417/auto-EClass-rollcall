const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('tku_login.html', 'utf16le');
const $ = cheerio.load(html);

$('form').each((i, f) => {
  console.log(`FORM [${i}]: id="${$(f).attr('id')}" action="${$(f).attr('action')}" method="${$(f).attr('method')}"`);
  $(f).find('input').each((j, inp) => {
    console.log(`  INPUT: type="${$(inp).attr('type')}" name="${$(inp).attr('name')}" value="${$(inp).attr('value')}"`);
  });
});
