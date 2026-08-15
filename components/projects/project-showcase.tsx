"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Upload, Video } from "lucide-react";
import { Shell } from "@/components/site-shell";
import { supabase } from "@/lib/supabase";
import { GamificationService } from "@/lib/gamification";
import { useAuth } from "@/components/auth-provider";
import { getStudentEnrollmentContext } from "@/lib/api/student/enrollment";
import { getStudentActivityRouteMap } from "@/lib/api/student/curriculum";
import { getApprovedProjects, submitStudentProject } from "@/lib/api/student/projects";

type Project = {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  video_url?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
};
const Youtube = Video;
const YOUTUBE_URL =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}(?:[?&].*)?$/;

export default function ProjectShowcase({
  mode = "public",
  embedded = false,
}: {
  mode?: "public" | "student";
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getApprovedProjects()
      .then((result) => {
        if (result.data) setProjects(result.data as Project[]);
      })
      .catch(() => undefined);
  }, []);
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setError("");
    setFile(null);
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("Images must be 5 MB or smaller.");
      return;
    }
    setFile(selected);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!title.trim() || !description.trim()) {
      setError("Add a title and a short project description.");
      return;
    }
    if (!user) {
      setError("Sign in as a student before submitting a project.");
      return;
    }
    if (videoUrl && !YOUTUBE_URL.test(videoUrl.trim())) {
      setError("Use a valid YouTube or youtu.be video URL.");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      let storagePath: string | undefined;
      if (file && supabase) {
        const filename = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage
          .from("project-images")
          .upload(filename, file, { contentType: file.type, upsert: false });
        if (uploadError)
          throw new Error(
            "Your image could not be uploaded. Please try again.",
          );
        imageUrl = supabase.storage
          .from("project-images")
          .getPublicUrl(filename).data.publicUrl;
        storagePath = filename;
      } else if (file) {
        throw new Error("Project image uploads require Supabase Storage configuration.");
      }
      const enrollCtx = await getStudentEnrollmentContext();
      if (!enrollCtx.data?.classroomId) throw new Error(enrollCtx.error || "Join an active classroom before submitting a project.");
      const projectRes = await submitStudentProject({
        classroomId: enrollCtx.data.classroomId,
        title,
        description,
        imageUrl,
        videoUrl: videoUrl.trim() || null,
        storagePath,
      });
      if (projectRes.error) throw new Error(projectRes.error);
      const routeMap = await getStudentActivityRouteMap();
      const projectActivityId = routeMap.data?.["project-showcase/challenge"];
      if (projectActivityId) {
        const { saveActivityProgress } = await import("@/lib/api/student/progress");
        await saveActivityProgress(enrollCtx.data.classroomId, { type: "master", activityId: projectActivityId }, "completed", { project_id: projectRes.data?.id });
      }
      
      await GamificationService.onLessonCompleted(
        user.id,
        "final-projects-showcase/submission",
      );
      setSaved(true);
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Your project could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  const content = (
    <main className={embedded ? "" : "mx-auto max-w-6xl px-5 py-14 sm:px-10 sm:py-20"}>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            MODULE 8
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-code-bg sm:text-4xl">
            {mode === "student" ? "Final Projects & Showcase" : "Student Project Showcase"}
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            {mode === "student"
              ? "Submit a photo of your Module 8 project and an optional YouTube link. Every submission is reviewed before it appears publicly."
              : "Approved student projects will appear here after trainers or admins review them."}
          </p>
        </div>
        {mode === "student" && (
          <form
            onSubmit={submit}
            className="mt-10 max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-xl font-bold text-code-bg">
              Submit your Module 8 project
            </h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Project title"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={800}
              placeholder="What did you make?"
              className="min-h-28 w-full rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
            />
            <label className="block rounded-xl border border-dashed border-border p-5 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <ImagePlus size={18} className="text-primary" />
                {file
                  ? file?.name
                  : "Choose a JPG, PNG, or WebP image (max 5 MB)"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseFile}
                className="mt-3 block text-xs font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Optional YouTube video URL
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-normal outline-none focus:border-primary"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && (
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CheckCircle2 size={17} /> Submitted for review. It will appear
                after approval.
              </p>
            )}
            <button
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Upload size={17} />
              )}{" "}
              Submit for review
            </button>
          </form>
        )}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-code-bg">
            Approved final projects
          </h2>
          {projects.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <h3 className="font-display text-xl font-bold text-code-bg">Nothing is here yet.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Approved student projects will appear here once the first project is reviewed.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="aspect-video bg-muted">
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-code-bg">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {project.description}
                    </p>
                    {project.video_url && (
                      <a
                        href={project.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
                      >
                        <Youtube size={17} />
                        Watch video
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
  );

  return embedded ? content : <Shell>{content}</Shell>;
}
