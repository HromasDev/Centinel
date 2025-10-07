import { Bot } from 'grammy';
import { fetchTopProducts } from './scraper.ts';
import { readState, writeState } from './storage.ts';
import { CustomContext, Product } from './types.ts';
import { config } from './config.ts';

const MONITORING_INTERVAL = 15000;

function formatPriceChangeMessage(oldPrice: number, newPrice: number, product: Product): string {
    const diff = Math.abs(oldPrice - newPrice);
    const link = `https://plati.market${product.href}`;
    if (newPrice < oldPrice) {
        return `📉 <b>Цена снизилась на ${diff} руб.!</b>\n\n` +
            `<b>${product.name}</b>\n` +
            `Продавец: ${product.seller}\n\n` +
            `Было: ${oldPrice} руб.\n<b>Стало: ${newPrice} руб.</b>\n\n` +
            `<a href="${link}">Ссылка на товар</a>`;
    } else {
        return `📈 <b>Цена выросла на ${diff} руб.</b>\n\n` +
            `<b>${product.name}</b>\n` +
            `Продавец: ${product.seller}\n\n` +
            `Было: ${oldPrice} руб.\n<b>Стало: ${newPrice} руб.</b>\n\n` +
            `<a href="${link}">Ссылка на товар</a>`;
    }
}

function formatNewProductMessage(newProduct: Product, oldProduct?: Product): string {
    const link = `https://plati.market${newProduct.href}`;
    let message = `🆕 <b>Новое выгодное предложение!</b>\n\n` +
        `<b>${newProduct.name}</b>\n` +
        `Продавец: ${newProduct.seller}\n` +
        `Цена: <b>${newProduct.price} руб.</b>\n\n`;
    if (oldProduct) {
        message += `<i>Это дешевле, чем предыдущее предложение (${oldProduct.price} руб.)</i>\n\n`;
    }
    message += `<a href="${link}">Ссылка на товар</a>`;
    return message;
}

async function checkPrices(bot: Bot<CustomContext>) {
    console.log('Проверка цен...');
    const state = readState();
    const newProducts = await fetchTopProducts();

    if (newProducts.length === 0) {
        console.log('Не удалось получить список товаров.');
        return;
    }

    const newTopProduct = newProducts[0];
    const oldTopProduct = state.lastKnownProducts?.[0];

    let message = '';

    if (!oldTopProduct) {
        console.log('Первый запуск. Сохранение текущих цен.');
        writeState({ ...state, lastKnownProducts: newProducts });
        return;
    }

    if (newTopProduct.price <= state.limit) {
        if (newTopProduct.name === oldTopProduct.name) {
            if (newTopProduct.price !== oldTopProduct.price) {
                message = formatPriceChangeMessage(oldTopProduct.price, newTopProduct.price, newTopProduct);
            }
        } else {
            message = formatNewProductMessage(newTopProduct, oldTopProduct);
        }
    }

    if (message) {
        try {
            await bot.api.sendMessage(config.receiverId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
        } catch (error) {
            console.error('Не удалось отправить сообщение:', error);
        }
    }

    writeState({ ...state, lastKnownProducts: newProducts });
}

export function startMonitoring(bot: Bot<CustomContext>) {
    console.log('Мониторинг цен запущен.');
    checkPrices(bot);
    setInterval(() => checkPrices(bot), MONITORING_INTERVAL);
}
