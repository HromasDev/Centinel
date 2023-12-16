const { Client, Events, GatewayIntentBits } = require('discord.js');
const keepAlive = require('./server.js')
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] });

client.on(Events.ClientReady, () => {
  const currentDate = new Date();
  console.log(`${currentDate.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | Бот запущен.`);
  
  const guild = client.guilds.cache.get(process.env.SERVER_ID);

  let userStatus = null;

  async function checkStatus() {
    return guild.members.fetch(process.env.TARGET_ID).then(member => {
      return member;
    });
  }

  setInterval(() => {
    checkStatus().then((user) => {
      if (user.presence && user.presence.status == 'online' && userStatus !== 'online') {
        guild.members.fetch(process.env.RECEIVER_ID).then(member => {
          date = new Date();
          member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | **${user} теперь в сети!**`)
        });
      }
      userStatus = user.presence ? user.presence.status : "offline";
    });
  }, 5000);
});

setInterval(() => {
    axios.get(`https://plati.market/asp/block_goods_category.asp?preorders=0&id_cb=0&id_c=${process.env.PLATI_ID}&id_r=21748&name=CD-Key&sort=price&page=1&rows=20&curr=RUR&pp_only=false&lang=ru-RU`)
        .then(response => {
            const $ = cheerio.load(response.data);
            let productList = [];
            for (let i = 1; i <= 5; i++) {
                productList.push({
                    name: $(`table > tbody > tr:nth-child(${i}) > td.product-title > div > a`).text(),
                    seller: $(`table > tbody > tr:nth-child(${i}) > td.product-merchant > div > a`).text(),
                    sales: $(`table > tbody > tr:nth-child(${i}) > td.product-sold > div`).text(),
                    price: $(`table > tbody > tr:nth-child(${i}) > td.product-price`).text()
                })
            }

            let oldProducts = JSON.parse(fs.readFileSync('data.json'));
            
            let oldPrice = +oldProducts[0].price.split(' ')[0];
            let newPrice = +productList[0].price.split(' ')[0];

            let isFindNewProduct = oldProducts.find(({ name }) => name === productList[0].name);

            if (oldPrice == newPrice) {
                if (!isFindNewProduct) {
                    member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | На маркете появилось новое предложение от ${productList[0].seller} за ${productList[0].price}`);
                    fs.writeFileSync('data.json', JSON.stringify(productList, null, 4));

                }
                // ничего не поменялось
            } else {
                if (!isFindNewProduct) {
                    member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | На маркете появилось новое предложение от ${productList[0].seller}, где ${productList[0].name} дешевле ${oldProducts[0].name} от ${oldProducts[0].seller} на ${oldPrice - newPrice} руб.`)
                }
                else if (oldPrice > newPrice) member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | ${oldProducts[0].name} от ${oldProducts[0].seller} подешевел на ${oldPrice - newPrice} руб!\n`)
                else if (oldPrice < newPrice) member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | ${oldProducts[0].name} от ${oldProducts[0].seller} подорожал на ${newPrice - oldPrice} руб!\n`)

                member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | Было: ${oldPrice} руб. \nСтало: ${newPrice} руб.`)

                fs.writeFileSync('data.json', JSON.stringify(productList, null, 4));
            }
        })
        .catch(error => console.error('Error:', error.message));
}, 10000)


client.login(process.env.TOKEN);

keepAlive();
