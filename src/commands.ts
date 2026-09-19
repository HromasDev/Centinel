import { Bot } from "grammy"
import {
	fetchGgselTopProducts,
	fetchTopProducts,
	productLink,
} from "./scraper.ts"
import { readState, writeState } from "./storage.ts"
import { CustomContext, Product } from "./types.ts"

function formatTopMessage(title: string, products: Product[]): string {
	const productMessages = products
		.map((p, index) => {
			return (
				`${index + 1}. <b><a href="${productLink(p.href)}">${p.name}</a></b>\n` +
				`   💰 Цена: <b>${p.price} ₽</b>\n` +
				`   👤 Продавец: ${p.seller}\n` +
				`   📊 Продано: ${p.sales}`
			)
		})
		.join("\n\n")

	return `<b>${title}</b>\n\n${productMessages}`
}

export function setupCommands(bot: Bot<CustomContext>) {
	bot.command(["start", "help"], (ctx) => {
		ctx.reply(
			"<b>Доступные команды:</b>\n\n" +
				"<code>/help</code> - Показать это сообщение\n" +
				"<code>/prices</code> - Показать 5 самых дешевых предложений (Plati.market + Ggsel, если задан)\n" +
				"<code>/limit N</code> - Установить лимит цены для Plati.market (например: <code>/limit 1000</code>)\n" +
				"<code>/ggsel SLUG</code> - Задать товар на Ggsel (параметр url из API, например: <code>/ggsel factorio-1</code>), <code>/ggsel off</code> - отключить\n" +
				"<code>/ggsel_prices</code> - Показать 5 самых дешевых предложений на Ggsel\n" +
				"<code>/ggsel_limit N</code> - Установить лимит цены для Ggsel\n" +
				"<code>/compact</code> - Включить/выключить компактный режим",
			{ parse_mode: "HTML" },
		)
	})

	bot.command("prices", async (ctx) => {
		await ctx.reply("🔍 Ищу самые выгодные предложения...")

		const { ggselProduct } = readState()

		const [platiProducts, ggselProducts] = await Promise.all([
			fetchTopProducts(),
			ggselProduct
				? fetchGgselTopProducts(ggselProduct)
				: Promise.resolve<Product[]>([]),
		])

		if (platiProducts.length > 0) {
			await ctx.reply(
				formatTopMessage(
					"🔥 Топ-5 предложений на Plati.market:",
					platiProducts,
				),
				{
					parse_mode: "HTML",
					disable_web_page_preview: true,
				},
			)
		} else {
			await ctx.reply(
				"❌ Не удалось получить список товаров с Plati.market. Сайт может быть недоступен или изменилась структура страницы.",
			)
		}

		if (ggselProduct) {
			if (ggselProducts.length > 0) {
				await ctx.reply(
					formatTopMessage("🔥 Топ-5 предложений на Ggsel:", ggselProducts),
					{
						parse_mode: "HTML",
						disable_web_page_preview: true,
					},
				)
			} else {
				await ctx.reply("❌ Не удалось получить список товаров с Ggsel.")
			}
		}
	})

	bot.command("ggsel", async (ctx) => {
		const arg = ctx.match.trim()
		const state = readState()

		if (!arg) {
			const current = state.ggselProduct
				? `Сейчас: <code>${state.ggselProduct}</code>`
				: "Сейчас мониторинг Ggsel отключен."
			await ctx.reply(
				`${current}\nИспользуйте: <code>/ggsel SLUG</code> или <code>/ggsel off</code>`,
				{ parse_mode: "HTML" },
			)
			return
		}

		if (arg === "off") {
			state.ggselProduct = ""
			state.ggselLastKnownProducts = []
			writeState(state)
			await ctx.reply("❌ Мониторинг Ggsel отключен.")
			return
		}

		if (!/^[\w-]+$/.test(arg)) {
			await ctx.reply(
				"❌ Неверный формат. Slug состоит из букв, цифр и дефисов, например: <code>/ggsel factorio-1</code>",
				{ parse_mode: "HTML" },
			)
			return
		}

		const products = await fetchGgselTopProducts(arg)
		if (products.length === 0) {
			await ctx.reply(
				`❌ По slug <code>${arg}</code> ничего не найдено, товар не изменен.`,
				{ parse_mode: "HTML" },
			)
			return
		}

		const fresh = readState()
		fresh.ggselProduct = arg
		fresh.ggselLastKnownProducts = products
		writeState(fresh)
		await ctx.reply(
			`✅ Товар на Ggsel: <code>${arg}</code>. Текущая минимальная цена: ${products[0].price} руб.`,
			{ parse_mode: "HTML" },
		)
	})

	bot.command("ggsel_prices", async (ctx) => {
		const { ggselProduct } = readState()
		if (!ggselProduct) {
			await ctx.reply(
				"❌ Товар на Ggsel не задан. Используйте: <code>/ggsel SLUG</code>",
				{ parse_mode: "HTML" },
			)
			return
		}

		await ctx.reply("🔍 Ищу самые выгодные предложения на Ggsel...")

		const products = await fetchGgselTopProducts(ggselProduct)
		if (products.length === 0) {
			await ctx.reply("❌ Не удалось получить список товаров с Ggsel.")
			return
		}

		await ctx.reply(
			formatTopMessage("🔥 Топ-5 предложений на Ggsel:", products),
			{
				parse_mode: "HTML",
				disable_web_page_preview: true,
			},
		)
	})

	bot.command("ggsel_limit", (ctx) => {
		const priceLimit = parseInt(ctx.match, 10)
		const state = readState()

		if (!isNaN(priceLimit) && priceLimit > 0) {
			state.ggselLimit = priceLimit
			writeState(state)
			ctx.reply(`✅ Лимит цены Ggsel установлен: ${priceLimit} руб.`)
		} else {
			ctx.reply(
				"❌ Неверный формат. Используйте: <code>/ggsel_limit ЧИСЛО</code>",
				{ parse_mode: "HTML" },
			)
		}
	})

	bot.command("limit", (ctx) => {
		const priceLimit = parseInt(ctx.match, 10)
		const state = readState()

		if (!isNaN(priceLimit) && priceLimit > 0) {
			state.limit = priceLimit
			writeState(state)
			ctx.reply(`✅ Лимит цены установлен: ${priceLimit} руб.`)
		} else {
			ctx.reply("❌ Неверный формат. Используйте: <code>/limit ЧИСЛО</code>", {
				parse_mode: "HTML",
			})
		}
	})

	bot.command("compact", (ctx) => {
		const state = readState()
		state.compact = !state.compact
		writeState(state)

		if (state.compact) {
			ctx.reply("✅ Компактный режим уведомлений включен.")
		} else {
			ctx.reply("❌ Компактный режим уведомлений выключен.")
		}
	})
}
