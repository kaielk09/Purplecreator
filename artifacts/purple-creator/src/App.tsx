import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { plPL } from '@clerk/localizations';
import {
  useCreateProject,
  useDeleteProject,
  useGenerateProjectArtifact,
  useGetProject,
  useListProjects,
  useRequestUploadUrl,
  useUpdateProject,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
} from '@workspace/api-client-react';
import type { Project, ProjectBlock, ProjectInput, ProjectUpdate } from '@workspace/api-client-react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Blocks, Check, ChevronDown, CircleHelp,
  Clock3, Code2, Command, Compass, FilePlus2, FolderKanban, Grid2X2, ImagePlus,
  Layers3, LoaderCircle, LogOut, MessageCircle, MoreHorizontal, PanelLeftClose, Plus,
  Puzzle, Rocket, Save, Search, Send, Settings2, ShieldCheck, Sparkles, Trash2, WandSparkles,
  X,
} from 'lucide-react';
import {
  Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useRoute,
} from 'wouter';

const queryClient = new QueryClient();
type ActiveAiPlan = { category: string; apply: () => void };
const AiPlanContext = createContext<{ activePlan: ActiveAiPlan | null; registerPlan: (plan: ActiveAiPlan | null) => void }>({
  activePlan: null,
  registerPlan: () => undefined,
});
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#b784ed',
    colorForeground: '#f2edf8',
    colorMutedForeground: '#a79bb5',
    colorDanger: '#ed7976',
    colorBackground: '#21192c',
    colorInput: '#17111f',
    colorInputForeground: '#f2edf8',
    colorNeutral: '#554665',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '14px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#21192c] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#40334f]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f2edf8] font-bold',
    headerSubtitle: 'text-[#b6a9c5]',
    socialButtonsBlockButtonText: 'text-[#eee7f6] font-semibold',
    formFieldLabel: 'text-[#e8dff0] font-semibold',
    footerActionLink: 'text-[#d0a8f7] font-semibold',
    footerActionText: 'text-[#b6a9c5]',
    dividerText: 'text-[#a79bb5]',
    identityPreviewEditButton: 'text-[#d0a8f7]',
    formFieldSuccessText: 'text-[#8ed8bf]',
    alertText: 'text-[#f2edf8]',
    logoBox: 'rounded-xl overflow-hidden',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border border-[#493b59] bg-[#271e32] hover:bg-[#30243c]',
    formButtonPrimary: 'bg-[#a76be0] hover:bg-[#b987eb] text-[#21152c] font-bold',
    formFieldInput: 'border border-[#51415f] bg-[#17111f] text-[#f2edf8] rounded-xl',
    footerAction: 'border-t border-[#40334f]',
    dividerLine: 'bg-[#493b59]',
    alert: 'border border-[#75464a] bg-[#321f2a]',
    otpCodeFieldInput: 'border border-[#51415f] bg-[#17111f] text-[#f2edf8]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

const versions = ['1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16', '1.17', '1.18', '1.19', '1.20', '1.21', '26.1', '26.2', '26.3', 'Latest'];
const iconURL = (path?: string | null) => path ? `/api/storage${path}` : '';
const uid = () => globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Przed chwilą';
const categoryLabel = (category: string) => category === 'mod' ? 'Mod' : 'Plugin';
const blockKindLabel = (kind: string) => ({
  command: 'Komenda',
  event: 'Zdarzenie',
  condition: 'Warunek',
  action: 'Akcja',
  item: 'Przedmiot',
  world: 'Świat',
}[kind] ?? 'Blok');

function AiPlanProvider({ children }: { children: ReactNode }) {
  const [activePlan, registerPlan] = useState<ActiveAiPlan | null>(null);
  return <AiPlanContext.Provider value={{ activePlan, registerPlan }}>{children}</AiPlanContext.Provider>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" data-testid="link-brand" className="inline-flex items-center gap-3 no-underline">
      <span className="grid h-10 w-10 place-items-center rounded-[13px] border border-violet-300/20 bg-violet-300/[.11] text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,.09)]">
        <Blocks size={21} strokeWidth={2.1} />
      </span>
      {!compact && <span className="display-font text-[17px] font-bold tracking-[-.045em] text-[#f5effc]">purple<span className="text-[#bd8af0]">creator</span></span>}
    </Link>
  );
}

function ActionLink({ href, children, className = '', testId }: { href: string; children: ReactNode; className?: string; testId: string }) {
  return <Link href={href} data-testid={testId} className={className}>{children}</Link>;
}

function Landing() {
  return (
    <main className="noise-overlay min-h-[100dvh] overflow-hidden">
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 md:px-10">
        <Brand />
        <div className="hidden items-center gap-9 text-[13px] text-[#b9adc8] md:flex">
          <a href="#how-it-works" className="transition hover:text-white" data-testid="link-how-it-works">Jak to działa</a>
          <a href="#built-for" className="transition hover:text-white" data-testid="link-built-for">Dla twórców</a>
          <a href="#purple-ai" className="transition hover:text-white" data-testid="link-purple-ai">Purple AI</a>
        </div>
        <div className="flex items-center gap-4">
          <ActionLink href="/sign-in" testId="link-sign-in" className="text-[13px] font-semibold text-[#d2c8dc] transition hover:text-white">Zaloguj się</ActionLink>
          <ActionLink href="/sign-up" testId="button-get-started" className="inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-[13px] font-bold text-[#21152c] shadow-[0_7px_28px_rgba(160,104,209,.17)] transition hover:-translate-y-0.5 hover:bg-[#cc9ff3]">Zacznij budować <ArrowRight size={15} /></ActionLink>
        </div>
      </nav>
      <section className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-6 pb-24 pt-12 md:grid-cols-[1.03fr_.97fr] md:px-10 md:pb-32 md:pt-20">
        <div className="fade-up relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#765b8b]/35 bg-[#261c30]/75 px-3 py-1.5 text-[11px] font-semibold tracking-[.04em] text-[#d2b4f0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#abedc9] shadow-[0_0_10px_rgba(171,237,201,.6)]" /> TU ZACZYNA SIĘ TWÓJ NOWY ŚWIAT
          </div>
          <h1 className="display-font max-w-[690px] text-[clamp(3.55rem,7.4vw,6.6rem)] font-semibold leading-[.94] tracking-[-.075em] text-[#f5effb]">
            Wielkie pomysły.<br /><span className="relative text-[#c391f1]">Blok po bloku.</span>
          </h1>
          <p className="mt-7 max-w-[460px] text-[16px] leading-7 text-[#b8adbf] md:text-[17px]">
            Kameralny warsztat na Twój kolejny mod lub plugin do Minecrafta. Rozwiń pomysł, połącz elementy i miej każdy projekt pod ręką.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ActionLink href="/sign-up" testId="button-create-first-project" className="group inline-flex items-center gap-3 rounded-[14px] bg-[#b982eb] px-5 py-3.5 text-[14px] font-extrabold text-[#22162d] transition hover:-translate-y-0.5 hover:bg-[#d0a3f3]">
              Stwórz coś nowego <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </ActionLink>
            <span className="inline-flex items-center gap-2 text-[12px] text-[#877c90]"><ShieldCheck size={15} className="text-[#a98ec2]" /> Zacznij za darmo · Stworzone dla Minecrafta</span>
          </div>
          <div className="mt-12 flex items-center gap-4 text-[12px] text-[#95899f]">
            <div className="flex -space-x-2">
              {['M', 'A', 'K', 'R'].map((c, i) => <span key={c} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#1c1523] text-[10px] font-bold ${['bg-[#533d6b]', 'bg-[#3a625e]', 'bg-[#765049]', 'bg-[#40526d]'][i]}`}>{c}</span>)}
            </div>
            <span>Spokojne miejsce na<br className="sm:hidden" /> kolejną ulubioną funkcję serwera.</span>
          </div>
        </div>
        <div className="fade-up relative mx-auto w-full max-w-[570px] [animation-delay:120ms]">
          <div className="absolute -inset-10 rounded-full bg-[#713c94]/10 blur-3xl" />
          <div className="float-slow relative rounded-[24px] border border-[#5d496e]/60 bg-[#1b1424]/95 p-3 shadow-[0_32px_100px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between border-b border-[#35283f] px-3 pb-3 pt-1">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d67d89]" /><span className="h-2 w-2 rounded-full bg-[#d5b06f]" /><span className="h-2 w-2 rounded-full bg-[#8cbd93]" /><span className="ml-3 text-[11px] text-[#a99bb5]">Szmaragdowe Relikty</span></div>
              <span className="mono-font rounded-md bg-[#2a2032] px-2 py-1 text-[9px] text-[#b797d2]">PLUGIN · 1.21</span>
            </div>
            <div className="grid min-h-[355px] grid-cols-[135px_1fr]">
              <div className="border-r border-[#35283f] py-4 pr-3">
                <div className="mb-4 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#81758d]"><Layers3 size={13} /> Bloki</div>
                {[
                  ['⌘', 'Komenda', 'text-[#c297ee]'],
                  ['◈', 'Po dołączeniu gracza', 'text-[#88cdb2]'],
                  ['◇', 'Daj przedmiot', 'text-[#e2b977]'],
                ].map(([symbol, label, shade]) => <div key={label} className="mb-2 flex items-center gap-2 rounded-lg border border-[#372941] bg-[#231a2d] px-2.5 py-2.5 text-[10px] text-[#c6bacf]"><span className={`text-[13px] ${shade}`}>{symbol}</span>{label}</div>)}
                <div className="mt-5 rounded-xl border border-dashed border-[#54415f] px-3 py-3 text-center text-[9px] leading-4 text-[#887b92]">Przeciągnij blok<br />do swojego pomysłu</div>
              </div>
              <div className="grid-paper relative overflow-hidden rounded-br-[15px]">
                <div className="absolute left-4 top-4 rounded-lg border border-[#493954] bg-[#201829]/95 px-3 py-2 text-[10px] text-[#d8ccdf] shadow-lg"><span className="mr-2 text-[#d2a6f3]">⌘</span>/relics</div>
                <div className="absolute left-4 top-[78px] h-[70px] w-[178px] rounded-xl border border-[#4b715f] bg-[#23352f]/95 p-3 shadow-[0_10px_22px_rgba(0,0,0,.22)]">
                  <div className="text-[8px] font-bold uppercase tracking-[.12em] text-[#92d1ad]">PO URUCHOMIENIU KOMENDY</div><div className="mt-2 text-[10px] text-[#e0e9dd]">Jeśli gracz ma uprawnienie</div>
                </div>
                <div className="absolute left-4 top-[164px] h-[74px] w-[178px] rounded-xl border border-[#7a6445] bg-[#3c3022]/95 p-3 shadow-[0_10px_22px_rgba(0,0,0,.22)]">
                  <div className="text-[8px] font-bold uppercase tracking-[.12em] text-[#e6c483]">NASTĘPNIE DAJ PRZEDMIOT</div><div className="mt-2 text-[10px] text-[#ece1ce]">Pradawne nasiono · 1</div>
                </div>
                <div className="absolute bottom-4 right-4 rounded-xl border border-[#493954] bg-[#211829]/90 px-3 py-2 text-[9px] text-[#c8b4d8]"><Sparkles size={11} className="mr-1.5 inline text-[#cb9ef1]" /> Purple AI już tu jest</div>
                <div className="absolute bottom-5 left-4 flex gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#5d416f]" /><span className="h-2 w-2 rounded-sm bg-[#5d416f]" /><span className="h-2 w-2 rounded-sm bg-[#5d416f]" /><span className="ml-1 text-[8px] text-[#8b7a97]">3 połączone bloki</span></div>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 -top-6 hidden rounded-2xl border border-[#57436a] bg-[#261d30] px-4 py-3 shadow-xl sm:block">
            <div className="flex items-center gap-2 text-[10px] text-[#bdadca]"><span className="grid h-6 w-6 place-items-center rounded-lg bg-[#382642] text-[#d3a7f1]"><WandSparkles size={13} /></span> Mały pomysł, wielki świat.</div>
          </div>
        </div>
      </section>
      <section className="border-y border-[#33263b] bg-[#1b1422]/75" id="how-it-works">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-6 py-7 md:grid-cols-3 md:px-10">
          {[['01', 'Złap iskrę', 'Nazwij swój mod lub plugin i daj mu własne miejsce.'], ['02', 'Ułóż logikę', 'Połącz bloki stworzone z myślą o Minecraftcie.'], ['03', 'Twórz dalej', 'Zapisz pracę i wróć do niej, kiedy zechcesz.']].map(([n, title, desc]) => <div key={n} className="flex gap-4"><span className="mono-font pt-1 text-[11px] text-[#a878ce]">{n}</span><div><h3 className="text-[13px] font-bold text-[#e8deef]">{title}</h3><p className="mt-1 text-[12px] text-[#91849a]">{desc}</p></div></div>)}
        </div>
      </section>
      <section id="built-for" className="mx-auto grid max-w-[1240px] gap-14 px-6 py-24 md:grid-cols-[.7fr_1.3fr] md:px-10 md:py-32">
        <div><div className="mono-font text-[10px] uppercase tracking-[.19em] text-[#b789d9]">Warsztat, nie arkusz kalkulacyjny</div><h2 className="display-font mt-5 max-w-[430px] text-4xl font-semibold leading-tight tracking-[-.06em] text-[#f3ecf8] md:text-[49px]">Dla tych chwil, gdy myślisz: <span className="text-[#c191ed]">„a gdyby tak…”</span></h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature icon={<Puzzle size={18} />} title="Mody i pluginy w jednym miejscu" text="Zacznij od projektu do Minecrafta, który naprawdę chcesz stworzyć." color="text-[#d4a7f2]" />
          <Feature icon={<Grid2X2 size={18} />} title="Logika jak na dłoni" text="Łącz przejrzyste bloki zamiast przebijać się przez stos konfiguracji." color="text-[#92d6bb]" />
          <Feature icon={<FolderKanban size={18} />} title="Pomysły w porządku" text="Jedno miejsce na eksperymenty, rozpoczęte projekty i plany na później." color="text-[#e4bf7a]" />
          <Feature icon={<MessageCircle size={18} />} title="Pomocnik od Minecrafta" text="Purple AI pomoże wymyślić komendy, zdarzenia i logikę moda." color="text-[#e292ac]" />
        </div>
      </section>
      <section id="purple-ai" className="mx-6 mb-24 overflow-hidden rounded-[28px] border border-[#584268] bg-[radial-gradient(ellipse_at_76%_0%,rgba(153,97,188,.23),transparent_44%),#21182a] md:mx-auto md:mb-32 md:max-w-[1160px]">
        <div className="grid items-center gap-10 px-7 py-10 md:grid-cols-[1fr_.72fr] md:px-14 md:py-14">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-[#76588d] bg-[#362442] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#d3a7f1]"><Sparkles size={13} /> Purple AI</span><h2 className="display-font mt-5 text-3xl font-semibold tracking-[-.055em] text-[#f3eaf8] md:text-[42px]">Pomysły na Minecrafta.<br /><span className="text-[#bd8dea]">Pomoc prosto z gry.</span></h2><p className="mt-4 max-w-[470px] text-[14px] leading-6 text-[#b5a7bd]">Zapytaj o komendę, zdarzenie gracza albo mechanikę moda. Purple AI trzyma się świata Minecrafta — bez zbędnych dygresji.</p></div>
          <div className="rounded-2xl border border-[#554061] bg-[#181320]/90 p-4 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 border-b border-[#3c2d46] pb-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#392448] text-[#d4a6f1]"><Sparkles size={15} /></span><div><div className="text-[12px] font-bold text-[#e8def0]">Purple AI</div><div className="text-[9px] text-[#92839d]">Pomocnik do Minecrafta</div></div><span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#8bd6b3]" /></div>
            <div className="max-w-[300px] rounded-xl rounded-tl-sm bg-[#2c2235] px-3.5 py-3 text-[11px] leading-5 text-[#d6cbdc]">Hej! Co tworzysz w swoim świecie Minecrafta?</div>
            <div className="ml-auto mt-3 max-w-[245px] rounded-xl rounded-tr-sm bg-[#60417a] px-3.5 py-3 text-[11px] leading-5 text-[#f3eafa]">Chcę dodać komendę /setspawn do pluginu.</div>
            <div className="mt-3 max-w-[340px] rounded-xl rounded-tl-sm bg-[#2c2235] px-3.5 py-3 text-[11px] leading-5 text-[#d6cbdc]">Dobry pomysł. Zacznij od bloku komendy, sprawdź uprawnienie i zapisz bieżącą lokalizację gracza jako punkt odrodzenia.</div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#493750] bg-[#211928] px-3 py-2 text-[10px] text-[#786d81]">Zapytaj o swój mod lub plugin… <Send size={13} className="ml-auto text-[#b887e2]" /></div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-6 pb-28 text-center md:px-10">
        <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-[#5c456c] bg-[#2b2034] text-[#cf9cf2]"><Rocket size={20} /></div>
        <h2 className="display-font text-3xl font-semibold tracking-[-.055em] text-[#f3ebf8] md:text-[42px]">Kolejny świetny pomysł na serwer należy do Ciebie.</h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[14px] leading-6 text-[#a99caf]">Nadaj mu nazwę. Dodaj pierwszy blok. Zobacz, dokąd Cię zaprowadzi.</p>
        <ActionLink href="/sign-up" testId="button-start-building-footer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-5 py-3 text-[13px] font-bold text-[#22162d] transition hover:-translate-y-0.5 hover:bg-[#d0a3f3]">Zacznij budować <ArrowRight size={15} /></ActionLink>
      </section>
      <footer className="border-t border-[#33263b] px-6 py-6"><div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 md:px-4"><Brand compact /><p className="text-[11px] text-[#786e81]">Mały warsztat dla twórców Minecrafta.</p><span className="mono-font text-[9px] text-[#655a6d]">STWORZONE DLA NADZIEMIA</span></div></footer>
    </main>
  );
}

function Feature({ icon, title, text, color }: { icon: ReactNode; title: string; text: string; color: string }) {
  return <article className="rounded-2xl border border-[#3d3047] bg-[#201827]/90 p-5 transition duration-300 hover:-translate-y-1 hover:border-[#665078]"><span className={`grid h-9 w-9 place-items-center rounded-xl bg-[#33263c] ${color}`}>{icon}</span><h3 className="mt-4 text-[14px] font-bold text-[#e8deef]">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[#9f92a9]">{text}</p></article>;
}

function AuthScreen({ mode }: { mode: 'in' | 'up' }) {
  return <main className="noise-overlay flex min-h-[100dvh] flex-col items-center justify-center bg-[#17111f] px-5 py-10" data-testid={`page-sign-${mode}`}>
    <div className="mb-8 flex flex-col items-center"><Brand /><p className="mt-4 text-[12px] text-[#a99caf]">{mode === 'in' ? 'Wróć do swoich rozpoczętych pomysłów.' : 'Znajdź miejsce na swój kolejny pomysł do Minecrafta.'}</p></div>
    {mode === 'in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />}
    <p className="mt-7 text-[10px] text-[#71677b]">Purple Creator powstał z myślą o modach i pluginach do Minecrafta.</p>
  </main>;
}

function AppFrame({ children, active = 'projects' }: { children: ReactNode; active?: 'projects' | 'new' | 'editor' }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileNav, setMobileNav] = useState(false);
  return <div className="min-h-[100dvh] bg-[#17111f]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-[#34283d] bg-[#1b1423] px-4 py-5 transition-transform md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex items-center justify-between px-1"><Brand /><button className="rounded-lg p-2 text-[#a59aaf] md:hidden" onClick={() => setMobileNav(false)} aria-label="Zamknij nawigację" data-testid="button-close-navigation"><X size={17} /></button></div>
      <div className="mt-9 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#786d83]">Twój warsztat</div>
      <nav className="mt-3 space-y-1">
        <ActionLink href="/projects" testId="nav-projects" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${active === 'projects' ? 'bg-[#382842] text-[#e6cafa]' : 'text-[#a99daf] hover:bg-[#271e2e] hover:text-[#eee6f3]'}`}><FolderKanban size={16} /> Projekty</ActionLink>
        <ActionLink href="/projects/new" testId="nav-new-project" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${active === 'new' ? 'bg-[#382842] text-[#e6cafa]' : 'text-[#a99daf] hover:bg-[#271e2e] hover:text-[#eee6f3]'}`}><FilePlus2 size={16} /> Nowy projekt</ActionLink>
      </nav>
      <div className="mt-auto">
        <div className="mb-4 rounded-2xl border border-[#483553] bg-[radial-gradient(ellipse_at_top_right,rgba(177,119,214,.14),transparent_60%),#241a2c] p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#e4d2ef]"><Sparkles size={14} className="text-[#c69be7]" /> Purple AI</div>
          <p className="mt-2 text-[10px] leading-4 text-[#a397ac]">Pomocnik od Minecrafta przy Twoim kolejnym pomyśle.</p>
          <div className="mt-3 flex items-center gap-1.5 text-[9px] text-[#b995d0]"><span className="h-1.5 w-1.5 rounded-full bg-[#8bd6b3]" /> Gotowy do pomocy</div>
        </div>
        <button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] text-[#92879c] transition hover:bg-[#281f30] hover:text-[#ede4f2]" data-testid="button-sign-out"><LogOut size={15} /> Wyloguj się</button>
        <div className="mt-3 flex items-center gap-3 border-t border-[#34283d] px-2 pt-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#4c3760] text-[10px] font-bold text-[#ead9f5]">{user?.firstName?.slice(0, 1) ?? user?.username?.slice(0, 1) ?? 'C'}</span>
          <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-[#ddd2e4]" data-testid="text-user-name">{user?.firstName || user?.username || 'Twórca'}</div><div className="text-[9px] text-[#81768a]">Twórca Minecrafta</div></div>
          <MoreHorizontal size={16} className="ml-auto text-[#746a7e]" />
        </div>
      </div>
    </aside>
    {mobileNav && <button className="fixed inset-0 z-30 bg-black/55 md:hidden" onClick={() => setMobileNav(false)} aria-label="Zamknij menu" data-testid="button-menu-backdrop" />}
    <div className="min-h-[100dvh] md:pl-[244px]">
      <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#34283d] bg-[#17111f]/90 px-5 backdrop-blur-xl md:px-9">
        <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-[#a99daf] md:hidden" aria-label="Otwórz nawigację" data-testid="button-open-navigation"><PanelLeftClose size={17} /></button><div className="hidden items-center gap-2 text-[11px] text-[#766c80] sm:flex"><span>Warsztat</span><span>/</span><span className="text-[#c5b7ce]">{active === 'new' ? 'Nowy projekt' : active === 'editor' ? 'Edytor bloków' : 'Projekty'}</span></div></div>
        <div className="flex items-center gap-2 rounded-full border border-[#493751] bg-[#241a2d] px-3 py-1.5 text-[10px] text-[#b7a7c2]"><span className="h-1.5 w-1.5 rounded-full bg-[#8fd8b5]" /> Twoje pomysły są tutaj zapisane</div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-9 md:py-10">{children}</main>
    </div>
  </div>;
}

function ProjectsDashboard() {
  const [, setLocation] = useLocation();
  const query = useListProjects();
  const projects = (query.data ?? []) as Project[];
  const removeProject = useDeleteProject();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'mod' | 'plugin'>('all');
  const filtered = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (category === 'all' || p.category === category)), [projects, search, category]);
  const deleteOne = (project: Project) => {
    if (window.confirm(`Usunąć „${project.name}”? Tej operacji nie można cofnąć.`)) removeProject.mutate({ id: project.id }, { onSuccess: () => {
      client.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      client.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } });
  };
  return <AppFrame active="projects">
    <div className="fade-up">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="mono-font text-[9px] uppercase tracking-[.18em] text-[#a77ac9]">TWÓJ KĄCIK W NADZIEMIU</div><h1 className="display-font mt-2 text-[34px] font-semibold tracking-[-.06em] text-[#f1eaf7]">Projekty</h1><p className="mt-1.5 text-[12px] text-[#9a8ea3]">Wszystko, co wymyślasz, w jednym miejscu.</p></div>
        <ActionLink href="/projects/new" testId="button-new-project" className="inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-[11px] font-extrabold text-[#22152d] transition hover:-translate-y-0.5 hover:bg-[#d0a3f3]"><Plus size={15} /> Nowy projekt</ActionLink>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2.5 rounded-xl border border-[#42334c] bg-[#211928] px-3.5 text-[#8e8198] sm:max-w-[330px]"><Search size={15} /><input data-testid="input-search-projects" value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj projektu..." className="w-full bg-transparent text-[11px] text-[#ece4f1] outline-none placeholder:text-[#766b7f]" /></label>
        <div className="flex rounded-xl border border-[#42334c] bg-[#211928] p-1">{(['all', 'mod', 'plugin'] as const).map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold capitalize transition ${category === item ? 'bg-[#493454] text-[#e8d5f5]' : 'text-[#8f8298] hover:text-[#e8dff0]'}`} data-testid={`filter-projects-${item}`}>{item === 'all' ? 'Wszystkie' : item === 'mod' ? 'Mody' : 'Pluginy'}</button>)}</div>
        <span className="ml-auto text-[10px] text-[#7c7185]" data-testid="text-project-count">{filtered.length} {filtered.length === 1 ? 'projekt' : filtered.length >= 2 && filtered.length <= 4 ? 'projekty' : 'projektów'}</span>
      </div>
      {query.isLoading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(n => <div key={n} className="h-[205px] animate-pulse rounded-2xl border border-[#392d43] bg-[#211928]" />)}</div>
        : query.isError ? <div className="mt-8 rounded-2xl border border-[#604049] bg-[#281d27] p-8 text-center"><CircleHelp className="mx-auto text-[#dc9292]" /><p className="mt-3 text-sm text-[#e7dce8]">Nie udało się wczytać projektów.</p><button onClick={() => query.refetch()} className="mt-4 rounded-lg bg-[#47324f] px-4 py-2 text-xs text-[#e6d6ef]" data-testid="button-retry-projects">Spróbuj ponownie</button></div>
        : filtered.length === 0 ? <div className="mt-8 overflow-hidden rounded-[24px] border border-dashed border-[#594663] bg-[radial-gradient(ellipse_at_50%_0%,rgba(146,93,175,.12),transparent_60%),#1e1725] px-6 py-14 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[21px] border border-[#594663] bg-[#30223a] text-[#ce9ded]"><Blocks size={27} /></div><h2 className="display-font mt-5 text-xl font-semibold tracking-[-.04em] text-[#eee5f4]">{projects.length === 0 ? 'Czeka na Ciebie nowy świat.' : 'W tym miejscu jeszcze pusto.'}</h2><p className="mx-auto mt-2 max-w-[330px] text-[11px] leading-5 text-[#96899f]">{projects.length === 0 ? 'Nazwij swój pomysł, wybierz mod lub plugin i zacznij tworzyć.' : 'Zmień wyszukiwaną frazę albo wybierz inny filtr.'}</p>{projects.length === 0 && <ActionLink href="/projects/new" testId="button-create-first" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-[11px] font-bold text-[#21152c]"><Plus size={14} /> Utwórz pierwszy projekt</ActionLink>}
        </div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project, i) => <ProjectCard key={project.id} project={project} index={i} deleting={removeProject.isPending} onOpen={() => setLocation(`/editor/${project.id}`)} onDelete={() => deleteOne(project)} />)}
          <button onClick={() => setLocation('/projects/new')} className="group flex min-h-[205px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#493951] bg-[#201827]/50 text-center transition hover:border-[#826298] hover:bg-[#251b2e]" data-testid="card-add-project"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#4d3b57] text-[#b887dc] transition group-hover:bg-[#392744]"><Plus size={18} /></span><span className="mt-3 text-[11px] font-semibold text-[#c1b4cb]">Zacznij kolejny pomysł</span><span className="mt-1 text-[9px] text-[#776c80]">Na jeszcze jeden zawsze znajdzie się miejsce</span></button>
        </div>}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#34283d] pt-5 text-[9px] text-[#766c80]"><span className="inline-flex items-center gap-2"><Clock3 size={12} /> Twoje projekty są zapisane w warsztacie</span><span className="mono-font">MODY I PLUGINY</span></div>
    </div>
  </AppFrame>;
}

function ProjectCard({ project, index, deleting, onOpen, onDelete }: { project: Project; index: number; deleting: boolean; onOpen: () => void; onDelete: () => void }) {
  return <article className="fade-up group relative overflow-hidden rounded-2xl border border-[#3e3049] bg-[#211928] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#684f7c] hover:bg-[#261c30]" style={{ animationDelay: `${index * 55}ms` }} data-testid={`card-project-${project.id}`}>
    <button onClick={onOpen} className="block w-full text-left" data-testid={`button-open-project-${project.id}`}>
      <div className="flex items-start gap-3.5"><div className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-[15px] border border-[#51405f] bg-[#31233a] text-[#c698e3]">{project.iconPath ? <img src={iconURL(project.iconPath)} alt={`Ikona projektu ${project.name}`} className="h-full w-full object-cover" data-testid={`img-project-icon-${project.id}`} /> : project.category === 'mod' ? <Puzzle size={23} /> : <Command size={23} />}</div><div className="min-w-0 flex-1 pt-1"><div className="truncate text-[14px] font-bold text-[#ece3f2]" data-testid={`text-project-name-${project.id}`}>{project.name}</div><div className="mt-1.5 flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-[.08em] ${project.category === 'mod' ? 'bg-[#382946] text-[#d0a2ee]' : 'bg-[#283b37] text-[#9dd9c1]'}`}>{categoryLabel(project.category)}</span><span className="mono-font text-[9px] text-[#8a7d92]">MC {project.version}</span></div></div><ArrowUpRight size={15} className="mt-1 text-[#786a82] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#d2a5f0]" /></div>
      <div className="mt-5 flex items-center justify-between border-t border-[#3a2c44] pt-3 text-[9px] text-[#82768b]"><span>{project.blocks?.length ?? 0} {(project.blocks?.length ?? 0) === 1 ? 'blok' : (project.blocks?.length ?? 0) >= 2 && (project.blocks?.length ?? 0) <= 4 ? 'bloki' : 'bloków'}</span><span>Zmiana: {formatDate(project.updatedAt)}</span></div>
    </button>
    <button onClick={onDelete} disabled={deleting} aria-label={`Usuń projekt ${project.name}`} className="absolute bottom-[50px] right-4 rounded-lg p-2 text-[#85798c] opacity-100 transition hover:bg-[#47252f] hover:text-[#ed9a9e] md:opacity-0 md:group-hover:opacity-100" data-testid={`button-delete-project-${project.id}`}><Trash2 size={14} /></button>
  </article>;
}

function CreateProjectPage() {
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const create = useCreateProject();
  const upload = useRequestUploadUrl();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'mod' | 'plugin'>('mod');
  const [version, setVersion] = useState('1.21');
  const [iconPath, setIconPath] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const chooseIcon = async (file?: File) => {
    if (!file) return;
    if (!validTypes.includes(file.type)) { setError('Wybierz obraz PNG, JPG, WEBP lub GIF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ikona musi mieć mniej niż 5 MB.'); return; }
    setError('');
    setUploading(true);
    setIconPreview(URL.createObjectURL(file));
    setFileName(file.name);
    try {
      const signed = await upload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' } });
      const result = await fetch(signed.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!result.ok) throw new Error('Nie udało się przesłać ikony. Spróbuj wybrać ją ponownie.');
      setIconPath(signed.objectPath);
      setIconPreview(iconURL(signed.objectPath));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się przesłać ikony.');
      setIconPath(null);
      setIconPreview('');
    } finally { setUploading(false); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) { setError('Nadaj projektowi nazwę, aby rozpocząć.'); return; }
    if (uploading) return;
    const payload: ProjectInput = { name: name.trim(), category, version, iconPath, blocks: [] };
    create.mutate({ data: payload }, { onSuccess: project => {
      client.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      client.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      setLocation(`/editor/${project.id}`);
    }, onError: () => setError('Nie udało się utworzyć projektu. Sprawdź połączenie i spróbuj ponownie.') });
  };
  return <AppFrame active="new">
    <div className="mx-auto max-w-[850px] fade-up">
      <Link href="/projects" data-testid="link-back-projects" className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#96899f] transition hover:text-[#e7d9ef]"><ArrowLeft size={14} /> Wróć do projektów</Link>
      <div className="mt-6"><div className="mono-font text-[9px] uppercase tracking-[.18em] text-[#a77ac9]">RODZI SIĘ NOWY POMYSŁ</div><h1 className="display-font mt-2 text-[34px] font-semibold tracking-[-.06em] text-[#f1eaf7]">Utwórz projekt</h1><p className="mt-2 text-[12px] text-[#9a8ea3]">Zacznij od podstaw, a potem rozwijaj pomysł w edytorze.</p></div>
      <form onSubmit={submit} className="mt-7 overflow-hidden rounded-[22px] border border-[#46364f] bg-[#211928]">
        <div className="grid gap-7 p-5 sm:p-8 md:grid-cols-[1fr_195px]">
          <div className="space-y-6">
            <div><label htmlFor="project-name" className="mb-2 block text-[11px] font-bold text-[#e4d9eb]">Nazwa projektu <span className="text-[#c490eb]">*</span></label><input id="project-name" autoFocus maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Jak nazwiesz swój kolejny pomysł?" className="h-11 w-full rounded-xl border border-[#4a3955] bg-[#191320] px-3.5 text-[12px] text-[#f0e8f5] outline-none transition placeholder:text-[#756a7f] focus:border-[#a36ecb] focus:ring-2 focus:ring-[#a36ecb]/15" data-testid="input-project-name" /><div className="mt-1.5 text-right text-[9px] text-[#776c80]" data-testid="text-project-name-length">{name.length}/80</div></div>
            <div><div className="mb-2 text-[11px] font-bold text-[#e4d9eb]">Co chcesz stworzyć?</div><div className="grid grid-cols-2 gap-3">
              {(['mod', 'plugin'] as const).map(kind => <button type="button" key={kind} onClick={() => setCategory(kind)} className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${category === kind ? 'border-[#9468ae] bg-[#36263f] ring-1 ring-[#9468ae]/25' : 'border-[#45364e] bg-[#1b1521] hover:border-[#695279]'}`} data-testid={`button-category-${kind}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${kind === 'mod' ? 'bg-[#493252] text-[#d3a8ef]' : 'bg-[#2b403b] text-[#9bdbbf]'}`}>{kind === 'mod' ? <Puzzle size={17} /> : <Command size={17} />}</span><span><span className="block text-[11px] font-bold capitalize text-[#e8deef]">{categoryLabel(kind)}</span><span className="mt-0.5 block text-[9px] text-[#96899f]">{kind === 'mod' ? 'Zmienia rozgrywkę' : 'Rozbudowuje serwer'}</span></span>{category === kind && <Check size={14} className="ml-auto text-[#d2a2f0]" />}</button>)}
            </div></div>
            <div><label htmlFor="mc-version" className="mb-2 block text-[11px] font-bold text-[#e4d9eb]">Wersja Minecrafta</label><div className="relative"><select id="mc-version" value={version} onChange={e => setVersion(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-[#4a3955] bg-[#191320] px-3.5 text-[12px] text-[#eee5f2] outline-none focus:border-[#a36ecb]" data-testid="select-minecraft-version">{versions.map(v => <option key={v} value={v}>{v === 'Latest' ? 'Najnowsza wersja' : `Minecraft ${v}`}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-3.5 text-[#96899f]" /></div></div>
          </div>
          <div><div className="mb-2 text-[11px] font-bold text-[#e4d9eb]">Ikona projektu <span className="font-normal text-[#7f7487]">· opcjonalnie</span></div><label className="group flex min-h-[190px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#594663] bg-[#1a1420] px-4 text-center transition hover:border-[#ac82cb] hover:bg-[#241a2d]" data-testid="dropzone-project-icon">
            {iconPreview ? <><img src={iconPreview} alt="Podgląd ikony projektu" className="mb-3 h-20 w-20 rounded-2xl border border-[#594663] object-cover" data-testid="img-project-icon-preview" /><span className="max-w-full truncate text-[10px] text-[#c4b5cf]">{fileName}</span><span className="mt-1 text-[9px] text-[#877a91]">Wybierz inną</span></> : <><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#30223a] text-[#c295e0] transition group-hover:scale-105"><ImagePlus size={20} /></span><span className="mt-3 text-[10px] font-semibold text-[#c7b9d0]">Dodaj ikonę</span><span className="mt-1 text-[9px] text-[#82768b]">PNG, JPG, WEBP, GIF<br />Do 5 MB</span></>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e => chooseIcon(e.target.files?.[0])} disabled={uploading} data-testid="input-project-icon" />
          </label>{uploading && <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-[#b991d6]" data-testid="status-icon-upload"><LoaderCircle size={12} className="animate-spin" /> Przesyłanie ikony…</div>}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3b2e44] bg-[#1d1624] px-5 py-4 sm:px-8">
          <div className="text-[9px] text-[#877b8f]">Szczegóły zmienisz w dowolnej chwili w edytorze.</div><div className="flex items-center gap-3"><Link href="/projects" data-testid="button-cancel-project" className="px-3 py-2 text-[10px] font-semibold text-[#a395ac] hover:text-white">Anuluj</Link><button type="submit" disabled={!name.trim() || uploading || create.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-[10px] font-extrabold text-[#21152c] transition hover:bg-[#d0a3f3] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-save-project">{create.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />} Utwórz projekt</button></div>
        </div>
        {error && <div className="border-t border-[#604049] bg-[#321f2a] px-8 py-3 text-[10px] text-[#efa9ab]" role="alert" data-testid="status-project-error">{error}</div>}
      </form>
      <div className="mt-4 flex items-center justify-center gap-2 text-[9px] text-[#72677b]"><ShieldCheck size={12} /> Projekt należy do Twojego warsztatu.</div>
    </div>
  </AppFrame>;
}

type PaletteBlock = { kind: string; title: string; hint: string; tone: string; settings: Record<string, unknown> };
const paletteBlocks: PaletteBlock[] = [
  { kind: 'command', title: 'Uruchom komendę', hint: 'Gdy gracz wpisze komendę', tone: 'violet', settings: { command: '/nowakomenda' } },
  { kind: 'event', title: 'Gracz dołącza', hint: 'Gdy gracz pojawia się w świecie', tone: 'mint', settings: { event: 'player_join' } },
  { kind: 'condition', title: 'Sprawdź uprawnienie', hint: 'Kontynuuj tylko przy właściwym uprawnieniu', tone: 'blue', settings: { permission: 'twoje.uprawnienie' } },
  { kind: 'action', title: 'Wyślij wiadomość', hint: 'Wyświetl wiadomość graczowi', tone: 'gold', settings: { message: 'Witaj w świecie!' } },
  { kind: 'action', title: 'Ustaw punkt odrodzenia', hint: 'Zapisz lokalizację gracza jako punkt odrodzenia', tone: 'rose', settings: { target: 'bieżąca pozycja gracza' } },
  { kind: 'item', title: 'Daj przedmiot', hint: 'Przekaż przedmiot graczowi', tone: 'orange', settings: { item: 'minecraft:diamond', amount: 1 } },
  { kind: 'world', title: 'Zmień świat', hint: 'Zmień właściwość świata', tone: 'teal', settings: { property: 'weather', value: 'clear' } },
];
const toneClasses: Record<string, string> = {
  violet: 'border-[#71528b] bg-[#342541] text-[#d0a7ed]',
  mint: 'border-[#4c7565] bg-[#263b34] text-[#a1d8c1]',
  blue: 'border-[#4e667f] bg-[#263341] text-[#a8c6e5]',
  gold: 'border-[#806945] bg-[#3a3022] text-[#e6c685]',
  rose: 'border-[#80536a] bg-[#3a2631] text-[#e5a3bd]',
  orange: 'border-[#805f40] bg-[#3b2d21] text-[#e9b784]',
  teal: 'border-[#467a75] bg-[#233735] text-[#9ad7d0]',
};

function blockTone(block: ProjectBlock): string {
  if (block.kind === 'command') return 'violet';
  if (block.kind === 'event') return 'mint';
  if (block.kind === 'condition') return 'blue';
  if (block.kind === 'item') return 'orange';
  if (block.kind === 'world') return 'teal';
  if (/spawn|odrodz/i.test(block.title)) return 'rose';
  return 'gold';
}

function EditorPage({ id }: { id: string }) {
  const query = useGetProject(id, { query: { queryKey: getGetProjectQueryKey(id), enabled: !!id } });
  const save = useUpdateProject();
  const generateJar = useGenerateProjectArtifact();
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const project = query.data as Project | undefined;
  const [blocks, setBlocks] = useState<ProjectBlock[]>([]);
  const [projectName, setProjectName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState('');
  const { registerPlan } = useContext(AiPlanContext);
  useEffect(() => { if (project) { setBlocks(project.blocks ?? []); setProjectName(project.name); setDirty(false); } }, [project?.id]);
  useEffect(() => {
    if (!project || !['mod', 'plugin'].includes(project.category)) return;
    registerPlan({
      category: project.category,
      apply: () => {
        const plan: ProjectBlock[] = [
          { id: uid(), kind: 'command', title: 'Uruchom komendę /setspawn', settings: { command: '/setspawn' } },
          { id: uid(), kind: 'condition', title: 'Sprawdź uprawnienie', settings: { permission: 'purplecreator.setspawn' } },
          { id: uid(), kind: 'action', title: 'Ustaw punkt odrodzenia', settings: { target: 'bieżąca pozycja gracza' } },
        ];
        setBlocks(currentBlocks => [...currentBlocks, ...plan]);
        setSelected(plan[0].id);
        setDirty(true);
        setSavedMessage('');
      },
    });
    return () => registerPlan(null);
  }, [project?.id, project?.category, registerPlan]);
  const current = blocks.find(block => block.id === selected);
  useEffect(() => { setSettingsDraft(current ? Object.entries(current.settings).map(([k, v]) => `${k}: ${String(v)}`).join('\n') : ''); }, [selected]);
  const addBlock = (item: PaletteBlock) => {
    const block: ProjectBlock = { id: uid(), kind: item.kind, title: item.title, settings: { ...item.settings } };
    setBlocks(old => [...old, block]);
    setSelected(block.id);
    setDirty(true);
    setSavedMessage('');
  };
  const updateBlock = (patch: Partial<ProjectBlock>) => {
    if (!selected) return;
    setBlocks(old => old.map(block => block.id === selected ? { ...block, ...patch } : block));
    setDirty(true);
    setSavedMessage('');
  };
  const removeBlock = (blockId: string) => { setBlocks(old => old.filter(b => b.id !== blockId)); if (selected === blockId) setSelected(null); setDirty(true); setSavedMessage(''); };
  const saveDraft = async () => {
    if (!project) throw new Error('Projekt nie jest dostępny.');
    const payload: ProjectUpdate = { name: projectName.trim() || project.name, category: project.category, version: project.version, iconPath: project.iconPath, blocks };
    const saved = await save.mutateAsync({ id, data: payload });
    client.setQueryData(getGetProjectQueryKey(id), saved);
    void client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
    void client.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    setDirty(false);
    setSavedMessage('Zapisano przed chwilą');
    setError('');
  };
  const saveNow = () => {
    setError('');
    void saveDraft().catch(() => setError('Nie udało się zapisać zmian. Spróbuj ponownie.'));
  };
  const generateArtifact = async () => {
    if (!project || generating) return;
    setGenerating(true);
    setError('');
    setSavedMessage('');
    try {
      if (dirty) await saveDraft();
      const jar = await generateJar.mutateAsync({ id });
      const objectUrl = URL.createObjectURL(jar);
      const anchor = document.createElement('a');
      const safeName = (projectName.trim() || project.name)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'purple-creator-project';
      anchor.href = objectUrl;
      anchor.download = `${safeName}.jar`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setSavedMessage('Plik .jar został pobrany');
    } catch (buildError) {
      const message = buildError instanceof Error ? buildError.message : '';
      setError(message || 'Nie udało się wygenerować pliku .jar. Spróbuj ponownie.');
    } finally {
      setGenerating(false);
    }
  };
  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...blocks]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next); setDirty(true);
  };
  const addable = paletteBlocks.filter(b => `${b.title} ${b.hint}`.toLowerCase().includes(filter.toLowerCase()));
  if (query.isLoading) return <AppFrame active="editor"><div className="animate-pulse" aria-label="Wczytywanie projektu"><div className="h-7 w-52 rounded-lg bg-[#30263a]" /><div className="mt-7 h-[620px] rounded-2xl border border-[#3d2f48] bg-[#211928]" /></div></AppFrame>;
  if (query.isError || !project) return <AppFrame active="editor"><div className="mx-auto max-w-lg rounded-2xl border border-[#5a3c46] bg-[#281d27] p-8 text-center"><CircleHelp className="mx-auto text-[#df9398]" /><h2 className="mt-3 text-lg font-bold text-[#f0e6ee]">Nie udało się otworzyć projektu.</h2><p className="mt-2 text-xs text-[#a598a7]">Projekt mógł zostać usunięty albo nie masz do niego dostępu.</p><button onClick={() => query.refetch()} className="mt-4 rounded-lg bg-[#49324f] px-4 py-2 text-xs text-[#eadbf0]" data-testid="button-retry-editor">Spróbuj ponownie</button><Link href="/projects" className="ml-3 text-xs text-[#c79ae8]" data-testid="link-editor-projects">Wróć do projektów</Link></div></AppFrame>;
  return <AppFrame active="editor">
    <div className="fade-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/projects" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#46364f] bg-[#211928] text-[#aa9bb6] transition hover:border-[#806096] hover:text-white" data-testid="button-editor-back"><ArrowLeft size={15} /></Link>
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#493951] bg-[#31233a] text-[#c798e4]">{project.iconPath ? <img src={iconURL(project.iconPath)} alt="" className="h-full w-full object-cover" /> : project.category === 'mod' ? <Puzzle size={16} /> : <Command size={16} />}</span>
          <div className="min-w-0"><input value={projectName} onChange={e => { setProjectName(e.target.value); setDirty(true); setSavedMessage(''); }} className="w-full max-w-[260px] truncate bg-transparent text-[14px] font-bold text-[#eee6f3] outline-none focus:border-b focus:border-[#b989da]" aria-label="Nazwa projektu" data-testid="input-editor-project-name" /><div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#84788d]"><span>{categoryLabel(project.category)}</span><span>·</span><span>MC {project.version}</span></div></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[9px] text-[#8c8095] sm:block" data-testid="status-save-state">{generating ? 'Generowanie pliku .jar…' : save.isPending ? 'Zapisywanie…' : savedMessage || (dirty ? 'Niezapisane zmiany' : 'Wszystkie zmiany zapisane')}</span>
          <button onClick={() => void generateArtifact()} disabled={generating || save.isPending} className="inline-flex items-center gap-2 rounded-xl border border-[#684b7b] bg-[#352640] px-4 py-2.5 text-[10px] font-extrabold text-[#e4c8f7] transition hover:border-[#956db0] hover:bg-[#443052] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-generate-artifact" title="Zapisz projekt i pobierz gotowy plik .jar">
            {generating ? <LoaderCircle size={13} className="animate-spin" /> : <Rocket size={13} />}
            {generating ? 'Generowanie…' : 'Generuj .jar'}
          </button>
          <button onClick={saveNow} disabled={save.isPending || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-[10px] font-extrabold text-[#21152c] transition hover:bg-[#d0a3f3] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-save-editor">{save.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />} Zapisz zmiany</button>
        </div>
      </div>
      {error && <div role="alert" className="mb-3 rounded-lg border border-[#604049] bg-[#321f2a] px-3 py-2 text-[10px] text-[#efa9ab]" data-testid="status-editor-error">{error}</div>}
      <div className="grid min-h-[calc(100dvh-210px)] overflow-hidden rounded-2xl border border-[#403149] bg-[#1c1523] lg:grid-cols-[235px_1fr_260px]">
        <section className="border-b border-[#3a2c44] bg-[#211928] lg:border-b-0 lg:border-r" aria-label="Minecraft block palette">
          <div className="flex items-center justify-between border-b border-[#3a2c44] px-4 py-4"><div><div className="text-[11px] font-bold text-[#e8deef]">Paleta bloków</div><div className="mt-1 text-[9px] text-[#81758a]">Bloki do Minecrafta</div></div><Layers3 size={15} className="text-[#b788d5]" /></div>
          <label className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-[#40324a] bg-[#1a1420] px-2.5 py-2 text-[#81758a]"><Search size={12} /><input value={filter} onChange={e => setFilter(e.target.value)} className="min-w-0 bg-transparent text-[9px] text-[#e6ddec] outline-none placeholder:text-[#746a7d]" placeholder="Znajdź blok..." data-testid="input-search-blocks" /></label>
          <div className="max-h-[calc(100dvh-355px)] space-y-2 overflow-auto p-3">
            {addable.map(item => <button key={`${item.kind}-${item.title}`} onClick={() => addBlock(item)} className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition hover:-translate-y-0.5 hover:brightness-110 ${toneClasses[item.tone]}`} data-testid={`button-add-block-${item.kind}-${item.title.toLowerCase().replaceAll(' ', '-')}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/15">{item.kind === 'command' ? <Command size={13} /> : item.kind === 'event' ? <Compass size={13} /> : item.kind === 'condition' ? <ShieldCheck size={13} /> : item.kind === 'item' ? <Blocks size={13} /> : <Code2 size={13} />}</span><span className="min-w-0 flex-1"><span className="block text-[9px] font-bold">{item.title}</span><span className="mt-0.5 block text-[8px] leading-3 opacity-70">{item.hint}</span></span><Plus size={13} className="shrink-0 opacity-70" /></button>)}
            {addable.length === 0 && <div className="px-2 py-6 text-center text-[9px] text-[#82768c]">Brak bloków pasujących do wyszukiwania.</div>}
          </div>
          <div className="border-t border-[#3a2c44] px-4 py-3 text-[8px] leading-4 text-[#81758a]"><Sparkles size={11} className="mr-1.5 inline text-[#c095e5]" />Bloki dla zdarzeń i akcji w Minecraftcie.</div>
        </section>
        <section className="grid-paper relative min-h-[470px] overflow-auto" aria-label="Project block canvas">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#43344f] bg-[#1d1725]/90 px-4 py-3 backdrop-blur"><div><div className="text-[10px] font-bold text-[#e9e0f0]">Obszar roboczy</div><div className="mt-0.5 text-[8px] text-[#8f8299]">Ułóż logikę swojego pomysłu</div></div><span className="mono-font rounded-md border border-[#4b3a57] bg-[#211a2a] px-2 py-1 text-[8px] text-[#a998b5]" data-testid="text-canvas-block-count">{blocks.length} {blocks.length === 1 ? 'blok' : blocks.length >= 2 && blocks.length <= 4 ? 'bloki' : 'bloków'}</span></div>
          {blocks.length === 0 ? <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-12 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#584663] bg-[#2a2032] text-[#ca9ce9]"><Grid2X2 size={22} /></div><h2 className="display-font mt-4 text-[16px] font-semibold text-[#e5d9ee]">Zacznij od bloku</h2><p className="mt-2 max-w-[240px] text-[10px] leading-5 text-[#92869a]">Wybierz z palety zdarzenie Minecrafta. Krok po kroku zbudujesz swój projekt.</p><div className="mt-4 hidden items-center gap-2 text-[8px] text-[#796e83] lg:flex"><ArrowLeft size={11} /> Wybierz blok po lewej</div></div>
            : <div className="mx-auto max-w-[600px] space-y-3 px-5 py-8">
              <div className="mb-5 rounded-xl border border-[#705184] bg-[#332440]/95 px-4 py-3 shadow-lg"><div className="mono-font text-[8px] uppercase tracking-[.13em] text-[#c496e6]">PRZEPŁYW PROJEKTU</div><div className="mt-1 text-[11px] font-semibold text-[#e7d9ef]">{projectName || project.name}</div></div>
              {blocks.map((block, index) => <div key={block.id} className={`group rounded-xl border p-3.5 shadow-[0_7px_19px_rgba(0,0,0,.18)] transition ${selected === block.id ? 'border-[#a274c2] ring-1 ring-[#a274c2]/25' : 'border-[#53415f]'} ${toneClasses[blockTone(block)]}`} data-testid={`canvas-block-${block.id}`}>
                <div className="flex items-start gap-3"><span className="mono-font pt-0.5 text-[8px] opacity-60">{String(index + 1).padStart(2, '0')}</span><button onClick={() => setSelected(block.id)} className="min-w-0 flex-1 text-left" data-testid={`button-select-block-${block.id}`}><span className="block text-[10px] font-bold">{block.title}</span><span className="mt-1 block text-[8px] opacity-70">{blockKindLabel(block.kind)} · {Object.entries(block.settings).map(([k,v]) => `${k} ${String(v)}`).join(' · ') || 'Bez ustawień'}</span></button><div className="flex items-center gap-0.5 opacity-75"><button onClick={() => moveBlock(index, -1)} aria-label="Przenieś blok wyżej" className="rounded-md p-1 hover:bg-black/20" data-testid={`button-move-block-up-${block.id}`}><ArrowUp size={12} /></button><button onClick={() => moveBlock(index, 1)} aria-label="Przenieś blok niżej" className="rounded-md p-1 hover:bg-black/20" data-testid={`button-move-block-down-${block.id}`}><ArrowDown size={12} /></button><button onClick={() => removeBlock(block.id)} aria-label="Usuń blok" className="rounded-md p-1 hover:bg-black/20" data-testid={`button-remove-block-${block.id}`}><X size={12} /></button></div></div>
              </div>)}
              <button onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-search-blocks"]')?.focus()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#665173] bg-[#261d2d]/70 py-3 text-[9px] font-semibold text-[#b99aca] transition hover:bg-[#30213a]" data-testid="button-add-next-block"><Plus size={13} /> Dodaj kolejny blok</button>
            </div>}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[#42334e] bg-[#1c1525]/85 px-2 py-1 text-[8px] text-[#82758c]">SIATKA · 28 PX</div>
        </section>
        <section className="border-t border-[#3a2c44] bg-[#211928] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-[#3a2c44] px-4 py-4"><div><div className="text-[11px] font-bold text-[#e8deef]">Szczegóły bloku</div><div className="mt-1 text-[9px] text-[#81758a]">Dostosuj ten fragment logiki</div></div><Settings2 size={15} className="text-[#ae8ad0]" /></div>
          {current ? <div className="p-4">
            <label className="mb-2 block text-[9px] font-bold text-[#d6c9de]">Nazwa bloku</label><input value={current.title} onChange={e => updateBlock({ title: e.target.value })} className="h-9 w-full rounded-lg border border-[#4a3955] bg-[#191320] px-2.5 text-[10px] text-[#ece3f2] outline-none focus:border-[#a36ecb]" data-testid="input-block-title" />
            <label htmlFor="block-settings" className="mb-2 mt-5 block text-[9px] font-bold text-[#d6c9de]">Ustawienia Minecrafta</label><textarea id="block-settings" value={settingsDraft} onChange={e => {
              setSettingsDraft(e.target.value);
              const settings: Record<string, unknown> = {};
              e.target.value.split('\n').filter(Boolean).forEach(line => { const sep = line.indexOf(':'); if (sep > -1) settings[line.slice(0, sep).trim()] = line.slice(sep + 1).trim(); });
              updateBlock({ settings });
            }} rows={7} className="w-full resize-y rounded-lg border border-[#4a3955] bg-[#191320] px-2.5 py-2 text-[9px] leading-5 text-[#d2c5db] outline-none focus:border-[#a36ecb]" data-testid="textarea-block-settings" /><p className="mt-2 text-[8px] leading-4 text-[#82768b]">Jedno ustawienie w wierszu, w formacie <span className="mono-font text-[#b594cd]">klucz: wartość</span>. Dotyczą Minecrafta.</p>
            <button onClick={() => removeBlock(current.id)} className="mt-5 flex items-center gap-2 rounded-lg border border-[#61414c] px-3 py-2 text-[9px] font-semibold text-[#d9939b] transition hover:bg-[#39232b]" data-testid="button-delete-selected-block"><Trash2 size={12} /> Usuń ten blok</button>
          </div> : <div className="flex min-h-[245px] flex-col items-center justify-center px-6 text-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#30243a] text-[#b98bdc]"><Settings2 size={17} /></div><p className="mt-3 text-[10px] font-semibold text-[#c5b8ce]">Wybierz blok, aby go edytować</p><p className="mt-1.5 text-[9px] leading-4 text-[#81758a]">Kliknij blok na planszy, aby zobaczyć jego szczegóły.</p></div>}
          <div className="border-t border-[#3a2c44] p-4"><div className="flex items-start gap-2.5 rounded-xl border border-[#493753] bg-[#291e31] p-3"><Sparkles size={13} className="mt-0.5 shrink-0 text-[#cb9ce9]" /><div><div className="text-[9px] font-bold text-[#d9c5e7]">Przyda się pomoc?</div><p className="mt-1 text-[8px] leading-4 text-[#95869e]">Zapytaj Purple AI o komendy, zdarzenia lub mechaniki Minecrafta.</p></div></div></div>
        </section>
      </div>
      <div className="mt-3 flex items-center justify-between text-[8px] text-[#796e82]"><span>Zmiany pozostaną na planszy, dopóki ich nie zapiszesz.</span><span className="mono-font">WARSZTAT / {categoryLabel(project.category).toUpperCase()}</span></div>
    </div>
  </AppFrame>;
}

type ChatMessage = { role: 'assistant' | 'user'; text: string; action?: 'add-setspawn-plan' };
const isSetSpawnRequest = (value: string) => /\/setspawn|set\s*spawn|ustaw.{0,30}(spawn|punkt odrodzenia)|punkt odrodzenia/.test(value.toLowerCase());

function purpleReply(message: string): string {
  const text = message.toLowerCase();
  const greeting = /^(siema|cześć|czesc|hej|witaj|witam|dzień dobry|dzien dobry|dobry wieczór|dobry wieczor)\b/.test(text);
  const minecraftFocused = /minecraft|plugin|mod|spigot|paper|fabric|forge|komend|serwer|gracz|świat|swiat|blok|spawn|odrodzen|przedmiot|mob|uprawnien|zdarzen|event|java|bukkit/.test(text);
  if (greeting) return 'Siema, budowniczy! Co tworzysz w swoim modzie albo pluginie do Minecrafta?';
  if (isSetSpawnRequest(text)) return 'Dobry pomysł na komendę Minecrafta. Ułóż ten przepływ: 1. Uruchom komendę /setspawn. 2. Sprawdź uprawnienie purplecreator.setspawn. 3. Zapisz bieżącą lokalizację gracza jako punkt odrodzenia. Ten sam układ sprawdzi się w pluginie serwerowym albo modzie. Jeśli masz otwarty projekt, możesz dodać te trzy bloki jednym kliknięciem.';
  if (!minecraftFocused) return 'Najlepiej czuję się w świecie Minecrafta. Opowiedz o modzie, pluginie, komendzie, zdarzeniu gracza albo mechanice gry, którą chcesz zbudować.';
  if (/komend|\/\w+/.test(text)) return 'Dobry przepływ komendy Minecrafta zaczyna się od bloku wyzwalającego, potem sprawdza uprawnienia i argumenty, a na końcu wykonuje akcję gracza lub świata. Co ma robić Twoja komenda — i tworzysz mod czy plugin?';
  if (/dołącz|dolacz|zdarzen|event|gracz/.test(text)) return 'Przy zdarzeniu gracza w Minecraftcie zacznij od bloku wyzwalającego, dodaj warunek lub uprawnienie, a na końcu akcję — na przykład wiadomość, przedmiot albo zmianę punktu odrodzenia. Co ma uruchamiać ten przepływ?';
  if (/przedmiot|mob|świat|swiat|mechanik|blok/.test(text)) return 'To może być ciekawa mechanika Minecrafta. Zacznij od zdarzenia, które ją uruchamia, dodaj warunek, jeśli potrzebujesz sprawdzenia, a potem blok akcji dla przedmiotu, moba lub świata. Co ma się wydarzyć w grze?';
  return 'Pomogę Ci rozwinąć pomysł na mod lub plugin do Minecrafta. Napisz, co go uruchamia, jakie warunki mają znaczenie i co powinno wydarzyć się w grze — ułożymy z tego bloki.';
}

function PurpleChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Cześć! Co tworzysz w swoim świecie Minecrafta?' }]);
  const { activePlan } = useContext(AiPlanContext);
  const send = (value = input) => {
    const clean = value.trim();
    if (!clean) return;
    const canApplyPlan = isSetSpawnRequest(clean) && !!activePlan && ['mod', 'plugin'].includes(activePlan.category);
    setMessages(old => [...old, { role: 'user', text: clean }, { role: 'assistant', text: purpleReply(clean), ...(canApplyPlan ? { action: 'add-setspawn-plan' as const } : {}) }]);
    setInput('');
  };
  const addSetSpawnPlan = () => {
    if (!activePlan || !['mod', 'plugin'].includes(activePlan.category)) return;
    activePlan.apply();
    setMessages(old => [...old.map(message => message.action ? { ...message, action: undefined } : message), { role: 'assistant', text: 'Gotowe — dodałem do bieżącego projektu komendę /setspawn, kontrolę uprawnienia i zapis punktu odrodzenia. Zapisz zmiany w edytorze, aby zachować plan.' }]);
  };
  return <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
    {open && <section className="mb-3 flex h-[440px] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border border-[#60496e] bg-[#201827] shadow-[0_20px_70px_rgba(0,0,0,.55)] fade-in" aria-label="Czat Purple AI" data-testid="panel-purple-ai">
      <header className="flex items-center gap-3 border-b border-[#42324b] bg-[radial-gradient(ellipse_at_top_right,rgba(166,106,198,.14),transparent_58%),#291f31] px-4 py-3.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#473054] text-[#d6a5f0]"><Sparkles size={17} /></span><div><div className="text-[11px] font-bold text-[#eee5f3]">Purple AI</div><div className="mt-0.5 flex items-center gap-1.5 text-[8px] text-[#a496ad]"><span className="h-1.5 w-1.5 rounded-full bg-[#8bd6b3]" /> Pomagam przy projektach Minecrafta</div></div><button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-2 text-[#a99caf] hover:bg-[#382940] hover:text-white" aria-label="Zamknij Purple AI" data-testid="button-close-purple-ai"><X size={15} /></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3.5" data-testid="list-purple-ai-messages">
        {messages.map((message, i) => <div key={`${i}-${message.role}`}><div className={`max-w-[88%] rounded-xl px-3 py-2.5 text-[10px] leading-[1.65] ${message.role === 'assistant' ? 'rounded-tl-sm bg-[#30243a] text-[#ddd2e5]' : 'ml-auto rounded-tr-sm bg-[#66447f] text-[#f5eafa]'}`} data-testid={`message-purple-ai-${i}`}>{message.text}</div>{message.action === 'add-setspawn-plan' && <button onClick={addSetSpawnPlan} className="mt-2 rounded-lg border border-[#826199] bg-[#392744] px-3 py-2 text-[9px] font-bold text-[#e4c9f4] transition hover:bg-[#4a3158]" data-testid="button-ai-add-setspawn-plan">Dodaj plan /setspawn do projektu <ArrowRight size={11} className="ml-1 inline" /></button>}</div>)}
        {messages.length === 1 && <div className="space-y-1.5 pt-1">{['Jak zrobić komendę /setspawn?', 'Pomysł na zdarzenie po dołączeniu gracza'].map((suggestion, i) => <button key={suggestion} onClick={() => send(suggestion)} className="block rounded-lg border border-[#51405d] bg-[#251b2d] px-2.5 py-2 text-left text-[9px] text-[#c6b6d0] transition hover:border-[#88669f] hover:bg-[#33243d]" data-testid={`button-ai-suggestion-${i}`}>{suggestion} <ArrowUpRight size={10} className="ml-2 inline" /></button>)}</div>}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-[#42324b] p-3"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Zapytaj o projekt Minecrafta…" className="min-w-0 flex-1 rounded-xl border border-[#4d3c58] bg-[#191320] px-3 py-2.5 text-[9px] text-[#ede4f2] outline-none placeholder:text-[#756a7e] focus:border-[#a16cc5]" data-testid="input-purple-ai" /><button type="submit" disabled={!input.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b982eb] text-[#22152d] transition hover:bg-[#d0a3f3] disabled:opacity-40" aria-label="Wyślij wiadomość" data-testid="button-send-purple-ai"><Send size={14} /></button></form>
      <div className="px-3 pb-2.5 text-center text-[8px] text-[#796e83]">Tylko mody i pluginy do Minecrafta</div>
    </section>}
    <button onClick={() => setOpen(v => !v)} className="group ml-auto flex h-[50px] items-center gap-2.5 rounded-full border border-[#725387] bg-[#352642] px-4 text-[#e6d3f3] shadow-[0_9px_28px_rgba(0,0,0,.36)] transition hover:-translate-y-0.5 hover:border-[#b381d5] hover:bg-[#443052]" data-testid="button-open-purple-ai" aria-expanded={open}><span className="grid h-7 w-7 place-items-center rounded-full bg-[#62447a] text-[#e1b6fa]"><Sparkles size={14} /></span><span className="text-[10px] font-bold">Zapytaj Purple AI</span><span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#8bd6b3]" /></button>
  </div>;
}

function SignedInRoute({ children }: { children: ReactNode }) {
  return <><Show when="signed-in">{children}</Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}

function HomeRoute() {
  return <><Show when="signed-in"><Redirect to="/projects" /></Show><Show when="signed-out"><Landing /></Show></>;
}

function EditorRoute() {
  const [matched, params] = useRoute<{ id: string }>('/editor/:id');
  return matched && params?.id ? <SignedInRoute><EditorPage id={params.id} /></SignedInRoute> : <Redirect to="/projects" />;
}

function NotFoundPage() {
  return <div className="grid min-h-[100dvh] place-items-center px-6 text-center"><div><div className="display-font text-5xl font-semibold text-[#c194e7]">404</div><h1 className="mt-3 text-xl font-bold text-[#eee6f3]">Ten zakątek świata jest pusty.</h1><p className="mt-2 text-xs text-[#96899f]">Wróćmy do Twojego warsztatu.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#b982eb] px-4 py-2.5 text-xs font-bold text-[#21152c]" data-testid="link-not-found-home">Wróć na początek <ArrowRight size={13} /></Link></div></div>;
}

function Router() {
  return <Switch>
    <Route path="/" component={HomeRoute} />
    <Route path="/sign-in/*?" component={() => <AuthScreen mode="in" />} />
    <Route path="/sign-up/*?" component={() => <AuthScreen mode="up" />} />
    <Route path="/projects" component={() => <SignedInRoute><ProjectsDashboard /></SignedInRoute>} />
    <Route path="/projects/new" component={() => <SignedInRoute><CreateProjectPage /></SignedInRoute>} />
    <Route path="/editor/:id" component={EditorRoute} />
    <Route component={NotFoundPage} />
  </Switch>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const [userChanged, setUserChanged] = useState(false);
  useEffect(() => {
    let previous: string | null | undefined;
    const unsubscribe = addListener(({ user }) => {
      const next = user?.id ?? null;
      if (previous !== undefined && previous !== next) {
        client.clear();
        setUserChanged(value => !value);
      }
      previous = next;
    });
    return unsubscribe;
  }, [addListener, client]);
  return <span className="hidden" aria-hidden="true" data-testid="clerk-cache-ready">{String(userChanged)}</span>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...plPL,
        signIn: { ...plPL.signIn, start: { ...plPL.signIn?.start, title: 'Witaj ponownie, twórco', subtitle: 'Zaloguj się i wróć do swoich pomysłów na Minecrafta.' } },
        signUp: { ...plPL.signUp, start: { ...plPL.signUp?.start, title: 'Znajdź miejsce na nowy pomysł', subtitle: 'Utwórz swój warsztat Purple Creator.' } },
      }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <AiPlanProvider>
        <Router />
        <PurpleChat />
      </AiPlanProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;