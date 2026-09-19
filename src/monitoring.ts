import { Bot } from "grammy"
import { config } from "./config.ts"
import {
	fetchGgselTopProducts,
	fetchTopProducts,
	productLink,
} from "./scraper.ts"
import { readState, writeState } from "./storage.ts"
import { AppState, CustomContext, Product } from "./types.ts"

interface Source {
	label: string
	fetch: (state: AppState) => Promise<Product[]>
	enabled: (state: AppState) => boolean
	getLimit: (state: AppState) => number
	getLast: (state: AppState) => Product[]
	setLast: (state: AppState, products: Product[]) => AppState
}

const SOURCES: Source[] = [
	{
		label: "Plati.market",
		fetch: () => fetchTopProducts(),
		enabled: () => true,
		getLimit: (s) => s.limit,
		getLast: (s) => s.lastKnownProducts,
		setLast: (s, p) => ({ ...s, lastKnownProducts: p }),
	},
	{
		label: "Ggsel",
		fetch: (s) => fetchGgselTopProducts(s.ggselProduct),
		enabled: (s) => Boolean(s.ggselProduct),
		getLimit: (s) => s.ggselLimit,
		getLast: (s) => s.ggselLastKnownProducts,
		setLast: (s, p) => ({ ...s, ggselLastKnownProducts: p }),
	},
]

function formatPriceChangeMessage(
	label: string,
	oldPrice: number,
	newPrice: number,
	product: Product,
): string {
	const diff = Math.abs(oldPrice - newPrice)
	const link = productLink(product.href)
	if (newPrice < oldPrice) {
		return (
			`📉 <b>[${label}] Цена снизилась на ${diff} руб.!</b>\n\n` +
			`<b>${product.name}</b>\n` +
			`Продавец: ${product.seller}\n\n` +
			`Было: ${oldPrice} руб.\n<b>Стало: ${newPrice} руб.</b>\n\n` +
			`<a href="${link}">Ссылка на товар</a>`
		)
	} else {
		return (
			`📈 <b>[${label}] Цена выросла на ${diff} руб.</b>\n\n` +
			`<b>${product.name}</b>\n` +
			`Продавец: ${product.seller}\n\n` +
			`Было: ${oldPrice} руб.\n<b>Стало: ${newPrice} руб.</b>\n\n` +
			`<a href="${link}">Ссылка на товар</a>`
		)
	}
}

function formatNewProductMessage(
	label: string,
	newProduct: Product,
	oldProduct?: Product,
): string {
	const link = productLink(newProduct.href)
	let message =
		`🆕 <b>[${label}] Новое выгодное предложение!</b>\n\n` +
		`<b>${newProduct.name}</b>\n` +
		`Продавец: ${newProduct.seller}\n` +
		`Цена: <b>${newProduct.price} руб.</b>\n\n`
	if (oldProduct) {
		message += `<i>Это дешевле, чем предыдущее предложение (${oldProduct.price} руб.)</i>\n\n`
	}
	message += `<a href="${link}">Ссылка на товар</a>`
	return message
}

async function checkSource(bot: Bot<CustomContext>, source: Source) {
	const initialState = readState()
	if (!source.enabled(initialState)) return

	console.log(`Проверка цен (${source.label})...`)
	const newProducts = await source.fetch(initialState)

	if (newProducts.length === 0) {
		console.log(`${source.label}: не удалось получить список товаров.`)
		return
	}

	const state = readState()
	if (!source.enabled(state)) return

	const newTopProduct = newProducts[0]
	const oldTopProduct = source.getLast(state)[0]

	if (!oldTopProduct) {
		console.log(`${source.label}: первый запуск. Сохранение текущих цен.`)
		writeState(source.setLast(readState(), newProducts))
		return
	}

	let message = ""

	if (newTopProduct.price <= source.getLimit(state)) {
		if (newTopProduct.name === oldTopProduct.name) {
			if (newTopProduct.price !== oldTopProduct.price) {
				message = formatPriceChangeMessage(
					source.label,
					oldTopProduct.price,
					newTopProduct.price,
					newTopProduct,
				)
			}
		} else {
			message = formatNewProductMessage(
				source.label,
				newTopProduct,
				oldTopProduct,
			)
		}
	}

	if (message) {
		try {
			await bot.api.sendMessage(config.receiverId, message, {
				parse_mode: "HTML",
				disable_web_page_preview: true,
			})
		} catch (error) {
			console.error("Не удалось отправить сообщение:", error)
		}
	}

	writeState(source.setLast(readState(), newProducts))
}

async function checkPrices(bot: Bot<CustomContext>) {
	await Promise.all(
		SOURCES.map((source) =>
			checkSource(bot, source).catch((error) => {
				console.error(`Ошибка при проверке ${source.label}:`, error)
			}),
		),
	)
}

export function startMonitoring(bot: Bot<CustomContext>) {
	console.log("Мониторинг цен запущен.")
	checkPrices(bot)
	setInterval(() => checkPrices(bot), config.checkIntervalSec * 1000)
}
