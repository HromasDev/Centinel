import { Bot } from 'grammy';
import { config } from './config.ts';
import { setupCommands } from './commands.ts';
import { startMonitoring } from './monitoring.ts';
import { CustomContext } from './types.ts';

async function main() {
  const bot = new Bot<CustomContext>(config.botToken);

  bot.use(async (ctx, next) => {
    if (ctx.from?.id === config.receiverId) {
      ctx.config = { receiverId: config.receiverId };
      await next();
    } else {
      console.log(`Сообщение от неавторизованного пользователя: ${ctx.from?.id}`);
    }
  });

  setupCommands(bot);

  startMonitoring(bot);

  bot.catch((err) => {
    console.error(`Ошибка в боте:`, err);
  });

  await bot.start();
  console.log(`Бот запущен! ID получателя: ${config.receiverId}`);
}

main().catch((err) => {
  console.error('Критическая ошибка при запуске бота:', err);
  process.exit(1);
});
