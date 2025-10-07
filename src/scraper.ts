import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from './types.ts';
import { config } from './config.ts';

const PLATI_MARKET_URL = 'https://plati.market/asp/block_goods_category_2.asp';

function parsePrice(priceText: string): number {
  const cleanedText = priceText.replace(/[^0-9,.]/g, '').replace(',', '.');
  return parseFloat(cleanedText);
}

export async function fetchTopProducts(): Promise<Product[]> {
  try {
    const response = await axios.get(PLATI_MARKET_URL, {
      params: {
        'id_c': config.platiMarketCategoryId,
        'sort': 'price',
        'page': 1,
        'rows': 20,
        'curr': 'rub',
        'lang': 'ru-RU'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const productList: Product[] = [];

    $('li.section-list__item').slice(0, 5).each((_, element) => {
      const card = $(element).find('a.card');
      
      const name = card.attr('title') || 'Без названия';
      const href = card.attr('href') || '#';
      
      const seller = card.find('span.caption-semibold.color-text-secondary').text().trim();
      
      const salesText = card.find('span.footnote-regular.color-text-tertiary').text().trim();
      const sales = salesText.replace('Продано', '').trim();
      
      const priceText = card.find('span.title-bold.color-text-title').text();
      const price = parsePrice(priceText);

      if (name && href && !isNaN(price)) {
        productList.push({ name, seller, sales, price, href });
      }
    });

    if (productList.length === 0) {
        console.log('Не удалось найти товары на странице. Возможно, изменилась структура HTML.');
    }

    return productList;

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
        console.error(`Ошибка при запросе к Plati.market: Статус ${error.response?.status}`);
    } else {
        console.error('Неизвестная ошибка при парсинге Plati.market:', error);
    }
    return [];
  }
}
