/**
 * Client half of the DeepSeek API peak-hours badge.
 *
 * Renders an ambient status pill below the composer. The pill appears only
 * while the session's selected provider is a DeepSeek route (official API key
 * or the DeepSeek account route):
 *   - red    — the DeepSeek peak-pricing window is active now;
 *   - yellow — a peak window starts within the next 30 minutes;
 *   - green  — off-peak (half price), with the time of the next peak start.
 *
 * Peak rule (DeepSeek Models & Pricing, Beijing time = UTC+8):
 *   Monday–Friday 09:00–12:00 and 14:00–18:00 are peak;
 *   weekends and Chinese statutory holidays are off-peak all day.
 */
window.__ModuleLoader__.load({
	id: 'dsh-deepseek-peak-badge',
	factory(require) {
		const React = require('react');
		const h = React.createElement;
		const NS = 'deepseekPeak';
		const DEEPSEEK_API_PROVIDERS = ['deepseek-official', 'deepseek-account'];

		// === peak-schedule-start ===
		const MINUTE_MS = 60000;
		const DAY_MS = 24 * 60 * MINUTE_MS;
		const BEIJING_OFFSET_MS = 8 * 60 * MINUTE_MS;
		const WARN_MINUTES = 30;
		/** [start, end) in minutes of the Beijing day: 09:00–12:00, 14:00–18:00. */
		const PEAK_WINDOWS = [
			[9 * 60, 12 * 60],
			[14 * 60, 18 * 60],
		];
		/** Chinese statutory holidays (State Council 2026 notice); weekday dates only matter. */
		const HOLIDAY_RANGES = [
			['2026-01-01', '2026-01-03'],
			['2026-02-15', '2026-02-23'],
			['2026-04-04', '2026-04-06'],
			['2026-05-01', '2026-05-05'],
			['2026-06-19', '2026-06-21'],
			['2026-09-25', '2026-09-27'],
			['2026-10-01', '2026-10-07'],
		];

		function pad2(value) {
			return value < 10 ? '0' + value : String(value);
		}

		function beijingClock(ms) {
			const shifted = new Date(ms + BEIJING_OFFSET_MS);
			const year = shifted.getUTCFullYear();
			const month = shifted.getUTCMonth();
			const day = shifted.getUTCDate();
			return {
				year,
				month,
				day,
				weekday: shifted.getUTCDay(),
				minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
				dateKey: year + '-' + pad2(month + 1) + '-' + pad2(day),
			};
		}

		function beijingMidnight(clock) {
			return Date.UTC(clock.year, clock.month, clock.day) - BEIJING_OFFSET_MS;
		}

		function isHoliday(dateKey) {
			for (const range of HOLIDAY_RANGES) {
				if (dateKey >= range[0] && dateKey <= range[1]) return true;
			}
			return false;
		}

		function isPeakDay(clock) {
			return clock.weekday >= 1 && clock.weekday <= 5 && !isHoliday(clock.dateKey);
		}

		function activePeakEnd(clock) {
			if (!isPeakDay(clock)) return null;
			for (const window of PEAK_WINDOWS) {
				if (clock.minutes >= window[0] && clock.minutes < window[1]) {
					return beijingMidnight(clock) + window[1] * MINUTE_MS;
				}
			}
			return null;
		}

		function nextPeakStart(ms) {
			const clock = beijingClock(ms);
			const base = beijingMidnight(clock);
			for (let offset = 0; offset <= 14; offset += 1) {
				const dayClock = beijingClock(base + offset * DAY_MS + 12 * 60 * MINUTE_MS);
				if (!isPeakDay(dayClock)) continue;
				const midnight = beijingMidnight(dayClock);
				for (const window of PEAK_WINDOWS) {
					const startAt = midnight + window[0] * MINUTE_MS;
					if (startAt > ms) return startAt;
				}
			}
			return null;
		}

		function computePhase(ms) {
			const clock = beijingClock(ms);
			const endsAt = activePeakEnd(clock);
			if (endsAt !== null) {
				return { level: 'peak', endsAt: endsAt, startsAt: null, minutes: 0, weekend: false, holiday: false };
			}
			const startsAt = nextPeakStart(ms);
			const remainingMs = startsAt === null ? Infinity : startsAt - ms;
			const holiday = isHoliday(clock.dateKey);
			const weekend = !holiday && (clock.weekday === 0 || clock.weekday === 6);
			if (remainingMs <= WARN_MINUTES * MINUTE_MS) {
				return {
					level: 'warn',
					endsAt: null,
					startsAt: startsAt,
					minutes: Math.max(1, Math.ceil(remainingMs / MINUTE_MS)),
					weekend: weekend,
					holiday: holiday,
				};
			}
			return { level: 'off', endsAt: null, startsAt: startsAt, minutes: 0, weekend: weekend, holiday: holiday };
		}
		// === peak-schedule-end ===

		function formatClock(ms) {
			if (ms === null) return '';
			try {
				return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
			} catch (error) {
				const date = new Date(ms);
				return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
			}
		}

		const NOOP_SUBSCRIBE = () => () => {};
		const NULL_SNAPSHOT = () => null;

		const STYLE = [
			'[data-dsh-peak-badge]{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;max-width:100%;border-radius:999px;padding:2px 9px;font-size:12px;line-height:16px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}',
			'[data-dsh-peak-badge] [data-dsh-peak-dot]{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}',
			'[data-dsh-peak-badge] [data-dsh-peak-text]{overflow:hidden;text-overflow:ellipsis}',
			'[data-dsh-peak-badge="peak"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}',
			'[data-dsh-peak-badge="warn"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent)}',
			'[data-dsh-peak-badge="off"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}',
		].join('');

		const DICTIONARIES = {
			ru: {
				peak: 'Пик DeepSeek · до {time}',
				warn: 'Пик DeepSeek через {minutes} мин',
				off: 'Офф-пик DeepSeek · пик в {time}',
				offWeekend: 'Офф-пик DeepSeek · выходные',
				offHoliday: 'Офф-пик DeepSeek · праздник',
				hint: 'Сейчас {now} по местному времени. Пиковые часы DeepSeek: пн–пт 09:00–12:00 и 14:00–18:00 по Пекину (UTC+8). В остальное время цена вдвое ниже.',
			},
			en: {
				peak: 'DeepSeek peak · until {time}',
				warn: 'DeepSeek peak in {minutes} min',
				off: 'DeepSeek off-peak · peak at {time}',
				offWeekend: 'DeepSeek off-peak · weekend',
				offHoliday: 'DeepSeek off-peak · holiday',
				hint: 'Local time {now}. DeepSeek peak hours: Mon–Fri 09:00–12:00 and 14:00–18:00 Beijing time (UTC+8). Off-peak is half price.',
			},
			zh: {
				peak: 'DeepSeek 高峰 · 至 {time}',
				warn: 'DeepSeek 高峰还有 {minutes} 分钟',
				off: 'DeepSeek 空闲 · 高峰 {time}',
				offWeekend: 'DeepSeek 空闲 · 周末',
				offHoliday: 'DeepSeek 空闲 · 节假日',
				hint: '当前本地时间 {now}。高峰时段为北京时间（UTC+8）周一至周五 09:00–12:00、14:00–18:00；其余时段价格五折。',
			},
		};

		function PeakBadge(props) {
			const directory = props.directory;
			const clock = props.clock;
			const locale = props.locale;
			const nowMs = React.useSyncExternalStore(
				(listener) => clock.subscribe(listener),
				() => clock.getSnapshot(),
			);
			const modelSnapshot = React.useSyncExternalStore(
				directory === null ? NOOP_SUBSCRIBE : (listener) => directory.subscribe(listener),
				directory === null ? NULL_SNAPSHOT : () => directory.getSnapshot(),
			);
			const phase = React.useMemo(() => computePhase(nowMs), [nowMs]);

			const provider = modelSnapshot !== null && modelSnapshot.current !== null ? modelSnapshot.current.provider : null;
			if (provider === null || DEEPSEEK_API_PROVIDERS.indexOf(provider) === -1) return null;

			const t = props.t !== undefined ? props.t : locale.bind(NS);
			let text;
			if (phase.level === 'peak') text = t('peak', { time: formatClock(phase.endsAt) });
			else if (phase.level === 'warn') text = t('warn', { minutes: phase.minutes });
			else if (phase.holiday) text = t('offHoliday');
			else if (phase.weekend) text = t('offWeekend');
			else text = t('off', { time: formatClock(phase.startsAt) });

			return h(
				React.Fragment,
				null,
				h('style', { key: 'style', 'data-dsh-plugin': 'deepseek-peak-badge' }, STYLE),
				h(
					'span',
					{
						key: 'badge',
						'data-dsh-peak-badge': phase.level,
						role: 'status',
						title: t('hint', { now: formatClock(nowMs) }),
					},
					h('span', { key: 'dot', 'data-dsh-peak-dot': '', 'aria-hidden': true }),
					h('span', { key: 'text', 'data-dsh-peak-text': '' }, text),
				),
			);
		}

		return {
			inject: ['slots', 'locale', 'modelDirectories'],
			apply(ctx) {
				const locale = ctx.locale;
				const directories = ctx.modelDirectories;
				let nowMs = Date.now();
				const listeners = new Set();
				const clock = {
					getSnapshot() {
						return nowMs;
					},
					subscribe(listener) {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
						};
					},
				};

				ctx.effect(() => {
					const timer = setInterval(() => {
						nowMs = Date.now();
						for (const listener of Array.from(listeners)) listener();
					}, 15000);
					return () => clearInterval(timer);
				}, 'deepseek-peak-badge: clock');

				ctx.effect(
					() => ctx.locale.register(NS, DICTIONARIES),
					'deepseek-peak-badge: dictionaries',
				);

				ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
					{
						name: 'conversation.composer.dock',
						id: 'deepseek-peak-badge',
						order: 10,
						locale: NS,
						inject: (sessionId) => {
							let directory = null;
							try {
								directory = directories.directoryFor(sessionId).store;
							} catch (error) {
								directory = null;
							}
							return { directory: directory, clock: clock, locale: locale };
						},
					},
					PeakBadge,
				));
			},
		};
	},
});
