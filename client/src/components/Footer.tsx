import { footerData, heroSectionData } from "../assets/assets";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t-4 border-[#F0A52B] bg-app-blue text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#F0A52B]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">

        {/* Four-column footer layout */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">

          {/* Brand */}
          <div>
            <Link to="/" className="mb-5 inline-flex items-center gap-3">
              <img
                src={heroSectionData.logo}
                alt="TorqueNest logo"
                className="size-9 object-contain transition-transform duration-300 hover:rotate-12"
              />
              <span className="text-xl font-bold tracking-tight">
                Torque<span className="text-[#F0A52B]">Nest</span>
              </span>
            </Link>

            <p className="mb-6 max-w-xs text-sm leading-6 text-white/65">
              {footerData.brand.description}
            </p>

            <div className="flex items-center gap-3">
              {footerData.brand.socials.map((social, i) => (
                <a
                  key={i}
                  href={social.link}
                  aria-label={`Social media ${i + 1}`}
                  className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 transition-all duration-300 hover:-translate-y-1 hover:border-[#F0A52B]/50 hover:bg-[#F0A52B] hover:text-[#172D40]"
                >
                  <social.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links and Customer Service */}
          {footerData.sections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <span className="h-4 w-1 rounded-full bg-[#F0A52B]" />
                {section.title}
              </h3>

              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="group inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-[#F0A52B]"
                      >
                        <span className="size-1 rounded-full bg-white/25 transition-colors group-hover:bg-[#F0A52B]" />
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href || "#"}
                        className="group inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-[#F0A52B]"
                      >
                        <span className="size-1 rounded-full bg-white/25 transition-colors group-hover:bg-[#F0A52B]" />
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Us — fourth column */}
          <div>
            <h3 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <span className="h-4 w-1 rounded-full bg-[#F0A52B]" />
              Contact Us
            </h3>

            <ul className="space-y-4">
              {footerData.contact.map((item, i) => {
                const Icon = item.icon;

                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#F0A52B]">
                      <Icon className="size-4" />
                    </span>

                    <span className="pt-1 text-sm leading-5 text-white/65 transition-colors hover:text-white">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {footerData.bottom.copyright.replace(
              /©\s*\d{4}/,
              `© ${new Date().getFullYear()}`
            ).replace("Greatstack", "TorqueNest")}
          </p>

          <div className="flex flex-wrap gap-5">
            {footerData.bottom.links.map((link, i) => (
              <a
                key={i}
                href={link.href}
                className="transition-colors hover:text-[#F0A52B]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;