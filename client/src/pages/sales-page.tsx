import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Gift,
  Magnet,
  Palette,
  PlayCircle,
} from "lucide-react";

import { ArtifactProof } from "@/components/marketing/artifact-proof";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  niche: z.string().optional(),
});

type SignUpData = z.infer<typeof signUpSchema>;

interface SignUpResponse {
  message: string;
  nextStep: "completeAccount" | "checkEmail" | "signIn";
  resumed: boolean;
}

const editorialFont = { fontFamily: '"Instrument Serif", Georgia, serif' };
const monoFont = { fontFamily: '"IBM Plex Mono", monospace' };

const faqs = [
  {
    question: "What content can I start with?",
    answer:
      "Paste text to create a Guide or Interactive Quiz. If you are making a Guide, you can also start from a YouTube video. VidMagnet structures the useful parts instead of simply shortening the source.",
  },
  {
    question: "When should I choose a Guide or an Interactive Quiz?",
    answer:
      "Choose a Guide when your lead needs an implementation path. Choose an Interactive Quiz when their best next step depends on their answers.",
  },
  {
    question: "Can each brand have its own look?",
    answer:
      "Yes. Brand Studio keeps each brand's logo, colors, typography, and public identity organized so the finished experience feels like it came from you.",
  },
  {
    question: "What is the Benefit Library?",
    answer:
      "It is a reusable home for free gifts and calls to action. Attach the right benefit after your Guide or Quiz has delivered something useful.",
  },
  {
    question: "Do I need to code anything?",
    answer:
      "No. You bring the source, choose the output, apply your brand, add the next step, and publish from VidMagnet.",
  },
];

function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="VidMagnet">
      <span
        className={`grid h-8 w-8 place-items-center rounded-[11px] border ${
          inverse
            ? "border-white/[0.15] bg-white/[0.10] text-[#79D9C7]"
            : "border-[#101419]/[0.15] bg-[#101419] text-[#79D9C7]"
        }`}
        aria-hidden="true"
      >
        <Magnet className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <span className={`text-[15px] font-bold tracking-[-0.02em] ${inverse ? "text-[#FBF8F2]" : "text-[#101419]"}`}>
        VidMagnet
      </span>
    </span>
  );
}

function Eyebrow({ children, inverse = false }: { children: string; inverse?: boolean }) {
  return (
    <p
      className={`mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${
        inverse ? "text-[#79D9C7]" : "text-[#3157F6]"
      }`}
      style={monoFont}
    >
      <span className={`h-0.5 w-7 ${inverse ? "bg-[#79D9C7]" : "bg-[#FF6B3D]"}`} aria-hidden="true" />
      {children}
    </p>
  );
}

export default function SalesPage() {
  const { toast } = useToast();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);
  const [shouldCheckEmail, setShouldCheckEmail] = useState(false);
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const signupTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "VidMagnet — Turn trusted content into useful lead magnets";

    if (!document.querySelector('link[data-vidmagnet-fonts="true"]')) {
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Instrument+Serif:ital@0;1&display=swap";
      fontLink.dataset.vidmagnetFonts = "true";
      document.head.appendChild(fontLink);
    }

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      niche: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      const response = await apiRequest("/api/auth/signup", "POST", data);
      return {
        status: response.status,
        body: (await response.json()) as SignUpResponse,
      };
    },
    onSuccess: ({ status, body }) => {
      if (status === 202 || body.nextStep === "checkEmail") {
        setShouldCheckEmail(true);
        setSignUpError(null);
        setUserAlreadyExists(false);
        return;
      }

      toast({
        title: body.resumed ? "Let's finish your account" : "Account created",
        description: "One more step and your VidMagnet workspace will be ready.",
      });
      window.location.assign("/complete-account");
    },
    onError: (error: Error) => {
      const alreadyExists = error.message.includes("409") || error.message.toLowerCase().includes("already exists");
      setUserAlreadyExists(alreadyExists);
      setSignUpError(
        alreadyExists
          ? "This email already has an account. Sign in to continue."
          : "We couldn't create your account. Check your connection and try again.",
      );
    },
  });

  const openSignUp = (event: ReactMouseEvent<HTMLButtonElement>) => {
    signupTriggerRef.current = event.currentTarget;
    setSignUpError(null);
    setUserAlreadyExists(false);
    setShouldCheckEmail(false);
    setIsSignUpOpen(true);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && signUpMutation.isPending) return;
    setIsSignUpOpen(nextOpen);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4EFE6] font-sans text-[#101419] selection:bg-[#79D9C7] selection:text-[#101419]">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-full bg-[#101419] px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <header className="border-b border-[#101419]/[0.12] bg-[#F4EFE6]">
        <nav className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <a href="#top" aria-label="VidMagnet home"><Wordmark /></a>
          <div className="flex items-center gap-2 sm:gap-4">
            <a className="hidden min-h-11 items-center px-2 text-sm font-semibold sm:flex" href="#choose">Guide or Quiz?</a>
            <a id="cta-nav-login" className="hidden min-h-11 px-2 py-3 text-sm font-semibold sm:block" href="/login">Log in</a>
            <Button id="cta-nav-start-free" data-cta-placement="nav" type="button" className="h-11 rounded-full bg-[#101419] px-5 font-bold text-white hover:bg-[#262C32]" onClick={openSignUp}>
              Start free
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section id="top" className="border-b border-[#101419]/[0.12] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <Eyebrow>From content to something useful</Eyebrow>
              <h1 className="text-[clamp(3.45rem,6vw,5.35rem)] font-bold leading-[0.93] tracking-[-0.06em]">
                Turn content you already trust into a lead magnet people can <span className="font-normal italic text-[#3157F6]" style={editorialFont}>actually use.</span>
              </h1>
              <p className="mt-7 max-w-[590px] text-lg leading-8 text-[#101419]/[0.66]">
                VidMagnet structures the useful parts, adds lead capture, your brand, a free gift or call to action, and publishes the finished experience.
              </p>
              <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <Button id="cta-hero-start-free" data-cta-placement="hero" type="button" size="lg" className="h-13 rounded-[14px] bg-[#FF6B3D] px-6 text-base font-bold text-[#101419] shadow-[0_6px_0_#B83E1B] hover:-translate-y-0.5 hover:bg-[#FF805C]" onClick={openSignUp}>
                  Start free <ArrowRight aria-hidden="true" />
                </Button>
                <a className="min-h-11 py-3 text-sm font-bold underline decoration-[#101419]/[0.35] underline-offset-4" href="#artifact-proof">See what it makes ↓</a>
              </div>
              <p className="mt-6 text-xs font-medium text-[#101419]/[0.52]">No code. Start with the content you already have.</p>
            </div>
            <div id="artifact-proof" className="min-w-0 scroll-mt-24 lg:col-span-7">
              <ArtifactProof />
            </div>
          </div>
        </section>

        <section id="choose" className="scroll-mt-6 bg-[#FBF8F2] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[1120px]">
            <Eyebrow>Choose the job</Eyebrow>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <h2 className="text-[clamp(3rem,5vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.05em]">
                Teach the next move—or diagnose where to start.
              </h2>
              <div className="border-t-2 border-[#101419]">
                <article className="grid gap-5 border-b border-[#101419]/[0.18] py-8 sm:grid-cols-[72px_1fr]">
                  <span className="text-3xl italic text-[#FF6B3D]" style={editorialFont}>01</span>
                  <div><h3 className="text-2xl font-bold tracking-[-0.03em]">Make a Guide</h3><p className="mt-3 leading-7 text-[#101419]/[0.62]">Paste your text—or start a Guide from a YouTube video—to turn expertise into clear steps, a checklist, a worksheet, and a next action.</p></div>
                </article>
                <article className="grid gap-5 border-b border-[#101419]/[0.18] py-8 sm:grid-cols-[72px_1fr]">
                  <span className="text-3xl italic text-[#3157F6]" style={editorialFont}>02</span>
                  <div><h3 className="text-2xl font-bold tracking-[-0.03em]">Make an Interactive Quiz</h3><p className="mt-3 leading-7 text-[#101419]/[0.62]">Paste your source text, ask diagnostic questions, and give each lead a personalized result, recommendations, and relevant next step.</p></div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="useful" className="border-y border-[#101419]/[0.12] bg-[#F4EFE6] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div><Eyebrow>Worth the opt-in</Eyebrow><h2 className="text-[clamp(3rem,5vw,4.5rem)] font-normal leading-[0.98] tracking-[-0.045em]" style={editorialFont}>Give them something worth the email.</h2><p className="mt-5 max-w-[460px] text-lg leading-8 text-[#101419]/[0.62]">Not a thin summary. A finished experience that helps a lead make progress.</p></div>
              <div className="space-y-0 border-t-2 border-[#101419]">
                {["A useful outcome is obvious from the start.", "Steps, checklists, or recommendations turn ideas into action.", "The right gift or call to action appears after value is delivered."].map((item, index) => (
                  <div key={item} className="flex gap-4 border-b border-[#101419]/[0.18] py-6 text-lg font-semibold leading-7"><Check className="mt-1 h-5 w-5 shrink-0 text-[#158A63]" aria-hidden="true" /><span>{item}</span><span className="ml-auto text-xs text-[#101419]/[0.35]" style={monoFont}>0{index + 1}</span></div>
                ))}
                <Button id="cta-proof-start-free" data-cta-placement="post-proof" type="button" variant="link" className="mt-5 h-auto px-0 py-3 text-base font-bold text-[#3157F6]" onClick={openSignUp}>Start free <ArrowRight aria-hidden="true" /></Button>
              </div>
            </div>
          </div>
        </section>

        <section id="brand-benefits" className="bg-[#101419] px-4 py-20 text-[#FBF8F2] sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[1120px]">
            <Eyebrow inverse>Make it recognizably yours</Eyebrow>
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div><h2 className="text-[clamp(3rem,5vw,4.7rem)] font-bold leading-[0.95] tracking-[-0.05em]">From opt-in to next step, without losing your brand.</h2><p className="mt-7 max-w-[500px] text-lg leading-8 text-white/[0.60]">First deliver something useful. Then make the relationship easy to continue with a recognizable brand, relevant gift, and clear call to action.</p></div>
              <div className="border-t border-white/[0.35]">
                <article className="grid gap-4 border-b border-white/[0.15] py-8 sm:grid-cols-[58px_1fr]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#3157F6] text-white"><Palette aria-hidden="true" /></span><div><h3 className="text-2xl font-bold">Brand Studio</h3><p className="mt-2 leading-7 text-white/[0.58]">Keep each brand's logo, colors, typography, and public identity consistent across its magnets.</p></div></article>
                <article className="grid gap-4 border-b border-white/[0.15] py-8 sm:grid-cols-[58px_1fr]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FF6B3D] text-[#101419]"><Gift aria-hidden="true" /></span><div><h3 className="text-2xl font-bold">Benefit Library</h3><p className="mt-2 leading-7 text-white/[0.58]">Save reusable free gifts and calls to action, then connect the right benefit when you publish.</p></div></article>
              </div>
            </div>
          </div>
        </section>

        <section id="publish" className="bg-[#FBF8F2] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
              <div>
                <Eyebrow>What happens after publish</Eyebrow>
                <h2 className="text-[clamp(3rem,5vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.05em]">Your next lead magnet may already be in your content.</h2>
                <p className="mt-6 max-w-[650px] text-lg leading-8 text-[#101419]/[0.62]">Publish one connected experience: useful first, lead capture second, and a relevant next step after that.</p>
                <div className="mt-10 border-t-2 border-[#101419]">
                  {["Branded landing page or Quiz", "Lead capture", "Useful Guide or personalized result", "Free gift or call to action"].map((label, index) => (
                    <div key={label} className="flex items-center gap-4 border-b border-[#101419]/[0.18] py-5"><span className="text-xs font-semibold text-[#3157F6]" style={monoFont}>0{index + 1}</span><span className="font-bold">{label}</span>{index === 0 && <PlayCircle className="ml-auto h-5 w-5 text-[#FF6B3D]" aria-hidden="true" />}</div>
                  ))}
                </div>
              </div>
              <div id="faq" className="scroll-mt-8">
                <p className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#101419]/[0.50]" style={monoFont}>Questions, answered plainly</p>
                <Accordion type="single" collapsible className="border-t border-[#101419]/[0.20]">
                  {faqs.map((item, index) => (
                    <AccordionItem key={item.question} value={`faq-${index}`} className="border-[#101419]/[0.16]">
                      <AccordionTrigger className="py-5 text-left text-base font-bold leading-6 hover:no-underline [&>svg]:text-[#FF6B3D]">{item.question}</AccordionTrigger>
                      <AccordionContent className="pb-6 pr-7 text-base leading-7 text-[#101419]/[0.62]">{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            <div className="mt-20 border-t border-[#101419]/[0.18] pt-16 text-center">
              <p className="mx-auto max-w-[820px] text-[clamp(3.3rem,6vw,5.4rem)] font-normal leading-[0.93] tracking-[-0.045em]" style={editorialFont}>Make your next piece of content work harder.</p>
              <p className="mx-auto mt-6 max-w-[560px] text-lg text-[#101419]/[0.60]">Start with one useful piece you already made.</p>
              <Button id="cta-final-start-free" data-cta-placement="final" type="button" size="lg" className="mt-8 h-13 rounded-[14px] bg-[#FF6B3D] px-7 text-base font-bold text-[#101419] shadow-[0_6px_0_#B83E1B] hover:-translate-y-0.5 hover:bg-[#FF805C]" onClick={openSignUp}>Start free <ArrowRight aria-hidden="true" /></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#101419]/[0.14] bg-[#F4EFE6] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><Wordmark /><p className="text-sm text-[#101419]/[0.52]">&copy; {new Date().getFullYear()} VidMagnet. Content in. Useful experience out.</p><nav className="flex gap-5 text-sm font-semibold" aria-label="Footer navigation"><a href="#choose">Guide or Quiz</a><a href="#faq">FAQ</a><a href="/login">Log in</a></nav></div>
      </footer>

      <Dialog open={isSignUpOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] border-[#101419]/[0.12] bg-[#FBF8F2] p-6 shadow-[0_28px_80px_rgba(16,20,25,0.35)] sm:max-w-md"
          aria-busy={signUpMutation.isPending}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => firstNameInputRef.current?.focus());
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            signupTriggerRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => { if (signUpMutation.isPending) event.preventDefault(); }}
          onInteractOutside={(event) => { if (signUpMutation.isPending) event.preventDefault(); }}
        >
          <DialogHeader className="pr-6 text-left">
            <div className="mb-3"><Wordmark /></div>
            <DialogTitle className="text-2xl font-bold tracking-[-0.035em] text-[#101419]">Build your first magnet</DialogTitle>
            <DialogDescription className="pt-1 leading-6 text-[#101419]/[0.58]">Create your free account, then choose a Guide or Interactive Quiz.</DialogDescription>
          </DialogHeader>

          {shouldCheckEmail ? (
            <div role="status" aria-live="polite" className="rounded-[22px] border border-[#158A63]/[0.25] bg-[#158A63]/[0.08] p-5">
              <p className="font-bold text-[#101419]">Check your email to continue</p>
              <p className="mt-2 text-sm leading-6 text-[#101419]/[0.65]">A setup link was sent to the address on the pending account. Open that link to finish securely.</p>
              <Button type="button" variant="outline" className="mt-5 h-10 rounded-full border-[#101419]/[0.20] bg-white px-4 font-bold" onClick={() => setIsSignUpOpen(false)}>Done</Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  setSignUpError(null);
                  setUserAlreadyExists(false);
                  signUpMutation.mutate(data);
                })}
                className="space-y-4"
                noValidate
                aria-busy={signUpMutation.isPending}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="firstName" render={({ field }) => <FormItem><FormLabel>First name</FormLabel><FormControl><Input autoComplete="given-name" placeholder="Jordan" className="h-11 rounded-full border-[#101419]/[0.18] bg-white px-4 focus-visible:ring-[#3157F6]" {...field} ref={(node) => { field.ref(node); firstNameInputRef.current = node; }} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="lastName" render={({ field }) => <FormItem><FormLabel>Last name</FormLabel><FormControl><Input autoComplete="family-name" placeholder="Taylor" className="h-11 rounded-full border-[#101419]/[0.18] bg-white px-4 focus-visible:ring-[#3157F6]" {...field} /></FormControl><FormMessage /></FormItem>} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Email address</FormLabel><FormControl><Input autoComplete="email" placeholder="you@company.com" type="email" className="h-11 rounded-full border-[#101419]/[0.18] bg-white px-4 focus-visible:ring-[#3157F6]" {...field} /></FormControl><FormMessage /></FormItem>} />

                {signUpError && (
                  <div id="signup-error" role="alert" aria-live="assertive" className="rounded-2xl border border-[#C33D3D]/[0.25] bg-[#C33D3D]/[0.06] p-3 text-sm leading-6 text-[#101419]/[0.75]">
                    {signUpError}{" "}
                    {userAlreadyExists && <a className="font-bold text-[#3157F6] underline underline-offset-2" href="/login">Sign in instead</a>}
                  </div>
                )}

                <Button type="submit" className="h-12 w-full rounded-full bg-[#FF6B3D] text-base font-bold text-[#101419] hover:bg-[#FF805C]" disabled={signUpMutation.isPending} aria-describedby={signUpError ? "signup-error" : undefined}>
                  {signUpMutation.isPending ? "Creating your account…" : "Create free account"}
                  {!signUpMutation.isPending && <ArrowRight aria-hidden="true" />}
                </Button>
                {signUpMutation.isPending && <p className="text-center text-xs text-[#101419]/[0.50]">Keep this window open while we create your workspace.</p>}
              </form>
            </Form>
          )}
          <p className="text-center text-xs leading-5 text-[#101419]/[0.48]">Already building with VidMagnet? <a className="font-bold text-[#3157F6] hover:underline" href="/login">Sign in</a></p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
