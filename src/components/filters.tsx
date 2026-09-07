"use client";
import { useState } from "react";
import Link from "next/link";
import type { Filters } from "@/lib/guide-types";
import { tourFamilies, tourFamily } from "@/lib/tour-catalog";
export function FilterForm({ filters, countries, cities, tours, games, currencies }: { filters: Filters; countries: [string,string][]; cities: [string,string][]; tours: string[]; games: string[]; currencies: string[] }) {
  const [currency,setCurrency] = useState(filters.currency || "");
  const [brand,setBrand] = useState(filters.brand || ""), [series,setSeries] = useState(filters.tour || "");
  const seriesOptions=brand?(tourFamily(brand)?.series||[]):[...new Set([...tours,...tourFamilies.flatMap(t=>t.series)])].sort();
  return <form className="filter-panel" action="/tournaments">
    <div className="filter-grid"><label className="filter-search">Search<input type="search" name="q" placeholder="Festival, city or venue" defaultValue={filters.q} /></label>
    <label>From<input type="date" name="from" defaultValue={filters.from}/></label><label>To<input type="date" name="to" defaultValue={filters.to}/></label>
    <label>Country<select name="country" defaultValue={filters.country}><option value="">All countries</option>{countries.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>City<select name="city" defaultValue={filters.city}><option value="">All cities</option>{cities.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>Tour / brand<select name="brand" value={brand} onChange={e=>{setBrand(e.target.value);setSeries("");}}><option value="">All tours</option>{tourFamilies.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
    <label>Series<select name="tour" value={series} onChange={e=>setSeries(e.target.value)}><option value="">All series</option>{seriesOptions.map(v=><option key={v}>{v}</option>)}</select></label>
    <label>Game<select name="game" defaultValue={filters.game}><option value="">All games</option>{games.map(v=><option key={v}>{v}</option>)}</select></label>
    <label>Currency<select name="currency" value={currency} onChange={e=>setCurrency(e.target.value)}><option value="">All currencies</option>{currencies.map(v=><option key={v}>{v}</option>)}</select></label>
    <label>Min. buy-in<input name="min" type="number" min="0" step="any" disabled={!currency} defaultValue={filters.min} placeholder={currency || "Select currency"}/></label>
    <label>Max. buy-in<input name="max" type="number" min="0" step="any" disabled={!currency} defaultValue={filters.max} placeholder={currency || "Select currency"}/></label>
    <label>Show<select name="status" defaultValue={filters.status || "upcoming"}><option value="upcoming">Upcoming & ongoing</option><option value="ongoing">Happening now</option><option value="ended">Past festivals</option><option value="cancelled">Cancelled</option><option value="postponed">Postponed</option><option value="all">All festivals</option></select></label>
    <button className="button" type="submit">Apply filters ↗</button></div>
    <div className="filter-foot"><span>Buy-in filters match highlighted events, including satellites. Amounts use the selected currency.</span><Link href="/tournaments">Reset filters</Link></div>
  </form>;
}
