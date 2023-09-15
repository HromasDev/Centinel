const { Client, Events, GatewayIntentBits } = require('discord.js');
const keepAlive = require('./server.js')

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

client.login(process.env.TOKEN);

keepAlive();
