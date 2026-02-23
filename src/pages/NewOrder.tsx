import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";

const SOURCE_COUNTRIES = ["India", "Nepal", "Philippines", "Bangladesh", "Vietnam", "Sri Lanka", "Pakistan", "Egypt", "Tunisia", "Turkey"];

interface OrderFormData {
  position_title: string;
  job_description: string;
  requirements: string;
  source_country: string;
  number_of_workers: number;
  start_date: string;
  contract_duration_months: number;
  work_schedule: string;
  serbian_language_required: boolean;
  experience_years: number;
  education_level: string;
  additional_skills: string;
  monthly_salary_eur: number;
  accommodation_provided: boolean;
  accommodation_type: string;
  accommodation_address: string;
  transportation_provided: boolean;
  meals_provided: boolean;
  other_benefits: string;
  notes: string;
}

const initialData: OrderFormData = {
  position_title: "",
  job_description: "",
  requirements: "",
  source_country: "",
  number_of_workers: 1,
  start_date: "",
  contract_duration_months: 12,
  work_schedule: "",
  serbian_language_required: false,
  experience_years: 0,
  education_level: "",
  additional_skills: "",
  monthly_salary_eur: 0,
  accommodation_provided: false,
  accommodation_type: "",
  accommodation_address: "",
  transportation_provided: false,
  meals_provided: false,
  other_benefits: "",
  notes: "",
};

export default function NewOrder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OrderFormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  const update = (field: keyof OrderFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.position_title.trim().length > 0 && form.number_of_workers > 0;
    return true;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!profile?.company_id) {
      toast.error("No company assigned. Contact your administrator.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        company_id: profile.company_id,
        position_title: form.position_title.trim(),
        job_description: form.job_description.trim(),
        requirements: form.requirements.trim(),
        source_country: form.source_country,
        number_of_workers: form.number_of_workers,
        start_date: form.start_date || null,
        contract_duration_months: form.contract_duration_months || null,
        work_schedule: form.work_schedule,
        serbian_language_required: form.serbian_language_required,
        experience_years: form.experience_years,
        education_level: form.education_level,
        additional_skills: form.additional_skills,
        monthly_salary_eur: form.monthly_salary_eur || null,
        accommodation_provided: form.accommodation_provided,
        accommodation_type: form.accommodation_type,
        accommodation_address: form.accommodation_address,
        transportation_provided: form.transportation_provided,
        meals_provided: form.meals_provided,
        other_benefits: form.other_benefits,
        notes: form.notes,
        status: asDraft ? "draft" : "submitted",
        submitted_at: asDraft ? null : new Date().toISOString(),
        reference_number: "", // trigger will generate
      } as any)
      .select("reference_number")
      .single();

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      if (asDraft) {
        toast.success(t("orders.saveDraft") + " ✓");
        navigate("/orders");
      } else {
        setRefNumber(data.reference_number);
        setSubmitted(true);
      }
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <h2 className="text-2xl font-bold">{t("orders.orderSubmitted")}</h2>
              <p className="text-muted-foreground">{t("orders.orderSubmittedDesc")}</p>
              <p className="text-lg font-semibold text-primary">
                {t("orders.yourReference")}: <span className="text-accent">{refNumber}</span>
              </p>
              <Button onClick={() => navigate("/dashboard")} className="mt-4">
                {t("orders.backToDashboard")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const steps = [
    { num: 1, title: t("orders.step1Title") },
    { num: 2, title: t("orders.step2Title") },
    { num: 3, title: t("orders.step3Title") },
    { num: 4, title: t("orders.step4Title") },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t("orders.wizardTitle")}</h1>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${
                step >= s.num ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {s.num}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.title}
              </span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? "bg-accent" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[step - 1].title}</CardTitle>
            <CardDescription>
              {t(`orders.step${step}Subtitle` as any)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>{t("orders.positionTitle")} *</Label>
                  <Input value={form.position_title} onChange={(e) => update("position_title", e.target.value)} placeholder={t("orders.positionPlaceholder")} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>{t("orders.jobDescription")}</Label>
                  <Textarea value={form.job_description} onChange={(e) => update("job_description", e.target.value)} rows={4} maxLength={2000} />
                </div>
                <div className="space-y-2">
                  <Label>{t("orders.requirements")}</Label>
                  <Textarea value={form.requirements} onChange={(e) => update("requirements", e.target.value)} rows={3} maxLength={1000} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("orders.sourceCountry")}</Label>
                    <Select value={form.source_country} onValueChange={(v) => update("source_country", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("orders.numberOfWorkers")} *</Label>
                    <Input type="number" min={1} max={500} value={form.number_of_workers} onChange={(e) => update("number_of_workers", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("orders.startDate")}</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("orders.contractDuration")}</Label>
                    <Input type="number" min={1} max={60} value={form.contract_duration_months} onChange={(e) => update("contract_duration_months", parseInt(e.target.value) || 12)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("orders.workSchedule")}</Label>
                  <Input value={form.work_schedule} onChange={(e) => update("work_schedule", e.target.value)} placeholder={t("orders.workSchedulePlaceholder")} maxLength={200} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.serbian_language_required} onCheckedChange={(v) => update("serbian_language_required", !!v)} />
                  <Label>{t("orders.serbianLanguage")}</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("orders.experienceYears")}</Label>
                    <Input type="number" min={0} max={30} value={form.experience_years} onChange={(e) => update("experience_years", parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("orders.educationLevel")}</Label>
                    <Select value={form.education_level} onValueChange={(v) => update("education_level", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("orders.educationNone")}</SelectItem>
                        <SelectItem value="primary">{t("orders.educationPrimary")}</SelectItem>
                        <SelectItem value="secondary">{t("orders.educationSecondary")}</SelectItem>
                        <SelectItem value="vocational">{t("orders.educationVocational")}</SelectItem>
                        <SelectItem value="higher">{t("orders.educationHigher")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("orders.additionalSkills")}</Label>
                  <Textarea value={form.additional_skills} onChange={(e) => update("additional_skills", e.target.value)} rows={2} maxLength={500} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>{t("orders.monthlySalary")}</Label>
                  <Input type="number" min={0} step={50} value={form.monthly_salary_eur} onChange={(e) => update("monthly_salary_eur", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.accommodation_provided} onCheckedChange={(v) => update("accommodation_provided", !!v)} />
                  <Label>{t("orders.accommodationProvided")}</Label>
                </div>
                {form.accommodation_provided && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label>{t("orders.accommodationType")}</Label>
                      <Input value={form.accommodation_type} onChange={(e) => update("accommodation_type", e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("orders.accommodationAddress")}</Label>
                      <Input value={form.accommodation_address} onChange={(e) => update("accommodation_address", e.target.value)} maxLength={300} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.transportation_provided} onCheckedChange={(v) => update("transportation_provided", !!v)} />
                  <Label>{t("orders.transportationProvided")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.meals_provided} onCheckedChange={(v) => update("meals_provided", !!v)} />
                  <Label>{t("orders.mealsProvided")}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{t("orders.otherBenefits")}</Label>
                  <Textarea value={form.other_benefits} onChange={(e) => update("other_benefits", e.target.value)} rows={2} maxLength={500} />
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span className="text-muted-foreground">{t("orders.positionTitle")}:</span></div>
                  <div className="font-medium">{form.position_title}</div>

                  <div><span className="text-muted-foreground">{t("orders.numberOfWorkers")}:</span></div>
                  <div className="font-medium">{form.number_of_workers}</div>

                  <div><span className="text-muted-foreground">{t("orders.sourceCountry")}:</span></div>
                  <div className="font-medium">{form.source_country || "—"}</div>

                  <div><span className="text-muted-foreground">{t("orders.startDate")}:</span></div>
                  <div className="font-medium">{form.start_date || "—"}</div>

                  <div><span className="text-muted-foreground">{t("orders.contractDuration")}:</span></div>
                  <div className="font-medium">{form.contract_duration_months} months</div>

                  <div><span className="text-muted-foreground">{t("orders.monthlySalary")}:</span></div>
                  <div className="font-medium">{form.monthly_salary_eur ? `€${form.monthly_salary_eur}` : "—"}</div>

                  <div><span className="text-muted-foreground">{t("orders.accommodationProvided")}:</span></div>
                  <div className="font-medium">{form.accommodation_provided ? t("common.yes") : t("common.no")}</div>

                  <div><span className="text-muted-foreground">{t("orders.transportationProvided")}:</span></div>
                  <div className="font-medium">{form.transportation_provided ? t("common.yes") : t("common.no")}</div>

                  <div><span className="text-muted-foreground">{t("orders.mealsProvided")}:</span></div>
                  <div className="font-medium">{form.meals_provided ? t("common.yes") : t("common.no")}</div>
                </div>
                {form.job_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("orders.jobDescription")}:</p>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{form.job_description}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t("orders.notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} maxLength={1000} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate("/orders")} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step > 1 ? t("common.back") : t("common.cancel")}
          </Button>
          <div className="flex gap-2">
            {step === 4 && (
              <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
                {t("orders.saveDraft")}
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                {t("common.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmit(false)} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("orders.submitOrder")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
