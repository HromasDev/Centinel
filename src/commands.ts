import { Bot } from 'grammy';
import { readState, writeState } from './storage.ts';
import { CustomContext } from './types.ts';
import { fetchTopProducts } from './scraper.ts';

export function setupCommands(bot: Bot<CustomContext>) {

  bot.command(['start', 'help'], (ctx) => {
    ctx.reply(
      '<b>Доступные команды:</b>\n\n' +
      '<code>/help</code> - Показать это сообщение\n' +
      '<code>/prices</code> - Показать 5 самых дешевых предложений\n' +
      '<code>/limit N</code> - Установить лимит цены (например: <code>/limit 1000</code>)\n' +
      '<code>/compact</code> - Включить/выключить компактный режим',
      { parse_mode: 'HTML' }
    );
  });

  bot.command('prices', async (ctx) => {
    await ctx.reply('🔍 Ищу самые выгодные предложения на Plati.market...');

    const products = await fetchTopProducts();

    if (!products || products.length === 0) {
      await ctx.reply('❌ Не удалось получить список товаров. Сайт может быть недоступен или изменилась структура страницы.');
      return;
    }

    const productMessages = products.map((p, index) => {
      const link = `https://plati.market${p.href}`;

      return `${index + 1}. <b><a href="${link}">${p.name}</a></b>\n` +
        `   💰 Цена: <b>${p.price} ₽</b>\n` +
        `   👤 Продавец: ${p.seller}\n` +
        `   📊 Продано: ${p.sales}`;
    }).join('\n\n');

    const finalMessage = `<b>🔥 Топ-5 предложений прямо сейчас:</b>\n\n${productMessages}`;

    await ctx.reply(finalMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  });

  bot.command('limit', (ctx) => {
    const priceLimit = parseInt(ctx.match, 10);
    const state = readState();

    if (!isNaN(priceLimit) && priceLimit > 0) {
      state.limit = priceLimit;
      writeState(state);
      ctx.reply(`✅ Лимит цены установлен: ${priceLimit} руб.`);
    } else {
      ctx.reply('❌ Неверный формат. Используйте: <code>/limit ЧИСЛО</code>', { parse_mode: 'HTML' });
    }
  });

  bot.command('compact', (ctx) => {
    const state = readState();
    state.compact = !state.compact;
    writeState(state);

    if (state.compact) {
      ctx.reply('✅ Компактный режим уведомлений включен.');
    } else {
      ctx.reply('❌ Компактный режим уведомлений выключен.');
    }
  });
}
