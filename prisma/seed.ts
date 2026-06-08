import { PrismaClient, Role, CourseStatus, LessonType, VideoProviderType, LivePlatform, CommissionScope, Currency, CouponType, HeroSlideTone, CourseEnrollmentMode } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "ChangeMe123!";

async function main() {
  console.log("🌱 Seed başlıyor...");

  const passwordHash = await hash(PASSWORD, 12);

  /** Tekrar seed çalıştırılınca şifre ve doğrulama her zaman bilinen demo değere çekilsin */
  const refreshDemoCredentials = {
    passwordHash,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    isActive: true,
    deletedAt: null,
  };

  // --- Users ---
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@yilmazer.local" },
    update: { ...refreshDemoCredentials, role: Role.SUPER_ADMIN },
    create: {
      email: "superadmin@yilmazer.local",
      passwordHash,
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Super", lastName: "Admin", displayName: "Super Admin" },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@yilmazer.local" },
    update: { ...refreshDemoCredentials, role: Role.ADMIN },
    create: {
      email: "admin@yilmazer.local",
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Platform", lastName: "Admin", displayName: "Admin" },
      },
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@yilmazer.local" },
    update: { ...refreshDemoCredentials, role: Role.INSTRUCTOR },
    create: {
      email: "instructor@yilmazer.local",
      passwordHash,
      role: Role.INSTRUCTOR,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: "Ayşe",
          lastName: "Yılmazer",
          displayName: "Uzm. Psk. Ayşe Yılmazer",
        },
      },
      instructorProfile: {
        create: {
          headline: "Klinik Psikolog · EMDR Terapisti",
          specialization: "Travma, Anksiyete",
          isVerified: true,
        },
      },
      walletBalance: {
        create: { currency: Currency.TRY },
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@yilmazer.local" },
    update: { ...refreshDemoCredentials, role: Role.STUDENT },
    create: {
      email: "student@yilmazer.local",
      passwordHash,
      role: Role.STUDENT,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: "Demo", lastName: "Öğrenci", displayName: "Demo Öğrenci" },
      },
    },
  });

  // --- Global commission ---
  await prisma.commissionRule.upsert({
    where: { id: "seed-global-commission" },
    update: {},
    create: {
      id: "seed-global-commission",
      scope: CommissionScope.GLOBAL,
      percent: 20,
      isActive: true,
    },
  });

  // --- System settings ---
  await prisma.systemSetting.upsert({
    where: { key: "platform.default_commission_percent" },
    update: { value: 20 },
    create: { key: "platform.default_commission_percent", value: 20 },
  });

  await prisma.systemSetting.upsert({
    where: { key: "platform.name" },
    update: { value: "Yılmazer Akademi" },
    create: { key: "platform.name", value: "Yılmazer Akademi" },
  });

  // --- Access roles (uygunluk etiketleri — System Role değil) ---
  const accessRoleDefs = [
    { slug: "usta", name: "Usta", sortOrder: 10, description: "Usta seviye uygunluk" },
    { slug: "kalfa", name: "Kalfa", sortOrder: 20, description: null },
    { slug: "teknik-personel", name: "Teknik personel", sortOrder: 30, description: null },
    { slug: "bayi", name: "Bayi", sortOrder: 40, description: null },
    {
      slug: "sertifikali-personel",
      name: "Sertifikalı personel",
      sortOrder: 50,
      description: null,
    },
    { slug: "kurumsal-uye", name: "Kurumsal üye", sortOrder: 60, description: null },
  ] as const;

  for (const r of accessRoleDefs) {
    await prisma.accessRole.upsert({
      where: { slug: r.slug },
      update: { name: r.name, sortOrder: r.sortOrder, description: r.description },
      create: {
        slug: r.slug,
        name: r.name,
        sortOrder: r.sortOrder,
        description: r.description,
        isActive: true,
      },
    });
  }

  // --- Category ---
  const category = await prisma.courseCategory.upsert({
    where: { slug: "klinik-psikoloji" },
    update: {},
    create: {
      name: "Klinik Psikoloji",
      slug: "klinik-psikoloji",
      description: "Klinik uygulama ve terapi odaklı eğitimler",
      sortOrder: 1,
    },
  });

  // --- Published course with polymorphic lessons ---
  const course = await prisma.course.upsert({
    where: { slug: "emdr-temel-egitim" },
    update: { enrollmentMode: CourseEnrollmentMode.APPLICATION },
    create: {
      instructorId: instructor.id,
      categoryId: category.id,
      title: "EMDR Temel Eğitim",
      slug: "emdr-temel-egitim",
      shortDescription: "EMDR protokolüne giriş ve uygulama temelleri",
      description:
        "Bu eğitimde EMDR terapisinin teorik altyapısı, faz yapısı ve klinik uygulama örnekleri ele alınır.",
      price: 3000,
      discountPrice: 2700,
      currency: Currency.TRY,
      difficulty: "INTERMEDIATE",
      tags: ["emdr", "travma", "terapi"],
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      metaTitle: "EMDR Temel Eğitim | Yılmazer Akademi",
      metaDescription: "Klinik psikologlar için EMDR temel eğitim programı.",
      enrollmentMode: CourseEnrollmentMode.APPLICATION,
    },
  });

  const existingModule = await prisma.module.findFirst({
    where: { courseId: course.id, title: "Modül 1: Giriş" },
  });

  const module1 =
    existingModule ??
    (await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Modül 1: Giriş",
        order: 1,
        lessons: {
          create: [
            {
              title: "EMDR'ye Giriş",
              lessonType: LessonType.VIDEO,
              order: 1,
              isFreePreview: true,
              durationMinutes: 45,
              video: {
                create: {
                  provider: VideoProviderType.R2,
                  storageKey: `videos/seed/${course.id}/intro.mp4`,
                  durationSeconds: 2700,
                  mimeType: "video/mp4",
                },
              },
            },
            {
              title: "Canlı Soru-Cevap Oturumu",
              lessonType: LessonType.LIVE,
              order: 2,
              liveSession: {
                create: {
                  platform: LivePlatform.ZOOM,
                  title: "EMDR Canlı Oturum",
                  description: "Katılımcı sorularının yanıtlandığı canlı oturum",
                  meetingUrl: "https://zoom.us/j/0000000000",
                  startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  joinAvailableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
                  durationMinutes: 90,
                  timezone: "Europe/Istanbul",
                },
              },
            },
            {
              title: "Ders Notları (PDF)",
              lessonType: LessonType.DOCUMENT,
              order: 3,
              document: {
                create: {
                  storageKey: `documents/seed/${course.id}/ders-notlari.pdf`,
                  fileName: "emdr-ders-notlari.pdf",
                  mimeType: "application/pdf",
                },
              },
            },
          ],
        },
      },
    }));

  void module1;

  // --- Anasayfa slider ---
  const heroSlideCount = await prisma.heroSlide.count();
  if (heroSlideCount === 0) {
    await prisma.heroSlide.createMany({
      data: [
        {
          eyebrow: "Psikologlar için premium eğitim",
          title: "Klinik becerilerinizi bir üst seviyeye taşıyın",
          description:
            "Canlı oturumlar, video dersler ve sertifikalı programlar — tek platformda.",
          primaryLabel: "Eğitimleri Keşfet",
          primaryHref: "/courses",
          secondaryLabel: "Giriş Yap",
          secondaryHref: "/login",
          tone: HeroSlideTone.EMERALD,
          sortOrder: 0,
          isActive: true,
        },
        {
          eyebrow: "Canlı oturumlar",
          title: "Zoom ve Teams ile interaktif ders deneyimi",
          description:
            "Uzman eğitmenlerle gerçek zamanlı oturumlara katılın; kayıtlı programlarınız tek panelde.",
          primaryLabel: "Canlı eğitimlere göz at",
          primaryHref: "/courses",
          secondaryLabel: "Panelim",
          secondaryHref: "/learn",
          tone: HeroSlideTone.SLATE,
          sortOrder: 1,
          isActive: true,
        },
        {
          eyebrow: "Sertifikalı programlar",
          title: "Tamamladığınız eğitimleri belgeleyin",
          description:
            "Mesleki gelişiminizi kanıtlayan sertifikalarla fark yaratın — yakında doğrulama linki ile.",
          primaryLabel: "Programları incele",
          primaryHref: "/courses",
          tone: HeroSlideTone.WARM,
          sortOrder: 2,
          isActive: true,
        },
      ],
    });
  }

  // --- Coupon ---
  await prisma.coupon.upsert({
    where: { code: "HOSGELDIN10" },
    update: {},
    create: {
      code: "HOSGELDIN10",
      type: CouponType.PERCENT,
      value: 10,
      maxUses: 100,
      isActive: true,
      courses: { create: [{ courseId: course.id }] },
    },
  });

  console.log("✅ Seed tamamlandı.");
  console.log("");
  console.log("Test hesapları (şifre: " + PASSWORD + "):");
  console.log("  SUPER_ADMIN:", superAdmin.email);
  console.log("  ADMIN:       ", admin.email);
  console.log("  INSTRUCTOR:  ", instructor.email);
  console.log("  STUDENT:     ", student.email);
  console.log("");
  console.log("Örnek kurs:", course.slug);
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
