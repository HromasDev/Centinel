const keepAlive = require('./server.js')
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
let limit = 99999;
let compact = false;

// Импорт библиотеки discord.js
const { Client, Events, GatewayIntentBits, Partials, ChannelType } = require('discord.js');

// Создание нового клиента Discord
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
})

client.once('ready', () => {
  console.log('Бот готов!');
});

client.on('messageCreate', msg => {
  if (msg.channel.type === ChannelType.DM) {
    if (msg.content.startsWith('!')) {
      const args = msg.content.slice(1).trim().split(/ +/g);
      const command = args.shift().toLowerCase();

      switch (command) {
        case 'помощь':
          msg.reply('**Существуют такие команды как:\n`!компакт` - устанавливает компактный режим отображения.\n`!лимит` - создает лимит (порог) на цену товара, если у вас есть определенный бюджет (к примеру 1000 руб), и вы хотите не получать постоянно информацию о изменении цены которая вас не устраивает, достаточно указать `!лимит добавить 1000`**');
          break;
        case 'лимит':
          switch (args[0]) {
            case 'создать':
              if (!isNaN(args[1])) {
                limit = +args[1];
                msg.reply(`**Лимит ${args[1]} руб. создан**`);
              } else if (!args[1]) {
                msg.reply(`**Укажите параметр**`);
              } else msg.reply(`**Указан неверный формат**`);
              break;
            default:
              msg.reply('**`!лимит создать N` - создает лимит**');
              break;
          }

          break;
        case 'компакт':
          if (compact == false) {
            msg.reply('Активирован компактный режим!');
            compact = true
          } else {
            msg.reply('Деактивирован компактный режим!');
            compact = false;
          }
          break;
        default:
          msg.reply('Извините, я не понимаю эту команду.');
      }
    };
  }
});

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
            price: $(`table > tbody > tr:nth-child(${i}) > td.product-price`).text(),
            href: $(`table > tbody > tr:nth-child(${i}) > td.product-title > div > a`).attr("href")
          })
        }

        let oldProducts = JSON.parse(fs.readFileSync('data.json'));

        let oldPrice = +oldProducts[0].price.split(' ')[0];
        let newPrice = +productList[0].price.split(' ')[0];

        let isFindNewProduct = oldProducts.find(({ name }) => name === productList[0].name);

        guild.members.fetch(process.env.RECEIVER_ID).then(member => {
          if (compact) {
            if (oldPrice !== newPrice) {
              fs.writeFileSync('data.json', JSON.stringify(productList, null, 4));
              if (newPrice <= limit) {
                member.send('```diff \n' + function () { if (oldPrice > newPrice) return `+ ${oldPrice} руб. -> ${newPrice} руб.`; else return `- ${oldPrice} руб. -> ${newPrice} руб.` } + '```');
              }
            }
          } else {
            if (oldPrice == newPrice) {
              if (!isFindNewProduct) {
                if (newPrice <= limit) {
                  member.send(`** На маркете появилось[новое предложение](https://plati.market${productList[0].href}) от ${productList[0].seller} за ${productList[0].price}**`);
                }
                fs.writeFileSync('data.json', JSON.stringify(productList, null, 4));
              }
              // ничего не поменялось
            } else {
              if (newPrice <= limit) {
                if (!isFindNewProduct) {
                  member.send(`**На маркете появилось [новое предложение](https://plati.market${productList[0].href}) от ${productList[0].seller}, где ${productList[0].name} дешевле ${oldProducts[0].name} от ${oldProducts[0].seller} на ${oldPrice - newPrice} руб.**`)
                }
                else if (oldPrice > newPrice) member.send(`**${oldProducts[0].name} от ${oldProducts[0].seller} подешевел на ${oldPrice - newPrice} руб! :chart_with_downwards_trend: \n https://plati.market${oldProducts[0].href}**`)
                else if (oldPrice < newPrice) member.send(`**${oldProducts[0].name} от ${oldProducts[0].seller} подорожал на ${newPrice - oldPrice} руб! :chart_with_upwards_trend: \n https://plati.market${oldProducts[0].href}**`)

                member.send(`**Было: ${oldPrice} руб. \nСтало: ${newPrice} руб.**`)
              }
              fs.writeFileSync('data.json', JSON.stringify(productList, null, 4));
            }
          }

        })
      })
      .catch(error => console.error('Error:', error.message));
  }, 10000)
});


client.login('OTM0NTA5NzUwNzgyMTQ0NTky.GELCuL.8RJNUNoCZNtoTLCSv2C5-MBiCCqz1fWLMcsMv4');

keepAlive();