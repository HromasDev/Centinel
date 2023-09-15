const { Client, Events, GatewayIntentBits } = require('discord.js');
import('./server.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] });

client.on(Events.ClientReady, () => {
  const currentDate = new Date();
  console.log(`${currentDate.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | Бот запущен.`);
  
  const guild = client.guilds.cache.get(serverId);

  let userStatus = null;

  async function checkStatus() {
    return guild.members.fetch(targetId).then(member => {
      return member;
    });
  }

  setInterval(() => {
    checkStatus().then((user) => {
      if (user.presence && user.presence.status == 'online' && userStatus !== 'online') {
        guild.members.fetch(receiverId).then(member => {
          date = new Date();
          member.send(`${date.toLocaleString('RU-ru', { timeZone: 'Asia/Omsk' })} | **${user} теперь в сети!**`)
        });
      }
      userStatus = user.presence ? user.presence.status : "offline";
    });
  }, 5000);

});

client.login(token);