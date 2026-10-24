import { useState } from "react";
import s from "./BodyAtlas.module.css";
const base = "https://openstax.org/books/anatomy-and-physiology-2e/pages/";
const tissues = [
  {
    id: "epithelial",
    name: "Epithelial tissue",
    summary:
      "Closely packed cells form surface coverings, internal linings, and glands. Identify cell shape, the number of layers, and the free apical surface.",
    source: "4-2-epithelial-tissue",
    types: [
      [
        "Simple squamous",
        "One layer of thin cells; suited to diffusion and filtration. Examples include alveolar lining and vascular endothelium.",
      ],
      [
        "Simple cuboidal",
        "One layer of roughly cube-shaped cells. Common in kidney tubules and small gland ducts.",
      ],
      [
        "Simple columnar",
        "One layer of tall cells. Many digestive linings use this organisation for absorption and secretion.",
      ],
      [
        "Stratified squamous",
        "Several cell layers with flattened surface cells. Found in protective linings and the epidermis.",
      ],
      [
        "Pseudostratified columnar",
        "A single layer that appears multilayered because nuclei lie at different heights; often ciliated in respiratory passages.",
      ],
      [
        "Transitional",
        "Specialised stratified epithelium that changes appearance as urinary organs stretch.",
      ],
    ],
  },
  {
    id: "connective",
    name: "Connective tissue",
    summary:
      "Cells are distributed within an extracellular matrix of fibres and ground substance. Matrix composition helps explain the tissue's mechanical properties.",
    source: "4-3-connective-tissue-supports-and-protects",
    types: [
      [
        "Loose connective tissue",
        "Includes areolar, adipose, and reticular tissue; supports and connects other tissues.",
      ],
      [
        "Dense connective tissue",
        "Prominent collagen fibres resist tension. Regular arrangements occur in many tendons; irregular arrangements resist forces from multiple directions.",
      ],
      [
        "Cartilage",
        "Chondrocytes occupy lacunae in a firm matrix. Hyaline, elastic, and fibrocartilage differ in their fibres and properties.",
      ],
      [
        "Bone",
        "Mineralised matrix provides rigid support. Compact bone and spongy bone have different structural arrangements.",
      ],
      ["Blood", "Cells and platelets are suspended in a fluid matrix, plasma."],
    ],
  },
  {
    id: "muscle",
    name: "Muscle tissue",
    summary:
      "Contractile cells generate force. Compare fibre shape, striations, branching, and nuclear position when distinguishing the three types.",
    source: "4-4-muscle-tissue-and-motion",
    types: [
      [
        "Skeletal muscle",
        "Long, striated fibres with multiple nuclei, typically at the periphery. Responsible for voluntary skeletal movement.",
      ],
      [
        "Cardiac muscle",
        "Striated, branching cells linked by intercalated discs. Found in the heart wall; contracts involuntarily.",
      ],
      [
        "Smooth muscle",
        "Spindle-shaped cells with a single central nucleus and no visible striations. Found in many hollow-organ walls.",
      ],
    ],
  },
  {
    id: "nervous",
    name: "Nervous tissue",
    summary:
      "Neurons carry electrical signals, while glial cells support neural tissue. Distinguish cell bodies from their processes and recognise that support cells are also essential.",
    source: "12-2-nervous-tissue",
    types: [
      [
        "Neurons",
        "The cell body contains the nucleus. Dendrites typically receive inputs, and the axon conducts signals toward other cells.",
      ],
      [
        "Central nervous system glia",
        "Astrocytes, oligodendrocytes, microglia, and ependymal cells have specialised support roles.",
      ],
      [
        "Peripheral nervous system glia",
        "Schwann cells and satellite cells support peripheral neurons.",
      ],
    ],
  },
];
function Diagram({ type }) {
  return (
    <svg
      viewBox="0 0 600 320"
      role="img"
      aria-label={`Original schematic of ${type} tissue, not a microscopic slide`}
      style={{
        width: "100%",
        maxHeight: 350,
        background: "#f4eef9",
        borderRadius: 18,
      }}
    >
      {type === "epithelial" && (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i}>
              <rect
                x={65 + i * 52}
                y="110"
                width="50"
                height="105"
                rx="5"
                fill="#c2a1da"
                stroke="#785599"
              />
              <ellipse
                cx={90 + i * 52}
                cy="180"
                rx="10"
                ry="14"
                fill="#6f478d"
              />
            </g>
          ))}
          <path d="M60 220H540" stroke="#806694" strokeWidth="7" />
          <text x="65" y="80">
            Apical surface
          </text>
          <text x="65" y="263">
            Basement membrane
          </text>
        </>
      )}
      {type === "connective" && (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              d={`M55 ${70 + i * 28} Q200 ${15 + i * 28} 310 ${85 + i * 28} T545 ${65 + i * 28}`}
              fill="none"
              stroke={i % 2 ? "#bd92a7" : "#a583bf"}
              strokeWidth={i % 2 ? 6 : 3}
            />
          ))}
          {[
            [140, 130],
            [290, 195],
            [430, 95],
          ].map(([x, y]) => (
            <g key={x}>
              <ellipse
                cx={x}
                cy={y}
                rx="28"
                ry="9"
                transform={`rotate(-25 ${x} ${y})`}
                fill="#986db8"
              />
              <ellipse cx={x} cy={y} rx="10" ry="5" fill="#5a3b71" />
            </g>
          ))}
          <text x="65" y="285">
            Fibres, cells, and extracellular matrix
          </text>
        </>
      )}
      {type === "muscle" && (
        <>
          {Array.from({ length: 4 }, (_, i) => (
            <g key={i}>
              <rect
                x="65"
                y={60 + i * 48}
                width="470"
                height="37"
                rx="12"
                fill="#d393a8"
              />
              {Array.from({ length: 22 }, (_, j) => (
                <path
                  key={j}
                  d={`M${82 + j * 20} ${60 + i * 48}v37`}
                  stroke="#ad6b82"
                  strokeWidth="3"
                />
              ))}
              <ellipse
                cx={110 + i * 85}
                cy={68 + i * 48}
                rx="14"
                ry="4"
                fill="#705082"
              />
            </g>
          ))}
          <text x="65" y="285">
            Skeletal muscle schematic: fibres and striations
          </text>
        </>
      )}
      {type === "nervous" && (
        <>
          <path
            d="M215 155L125 75M190 132L160 65M213 157L115 175M150 169L90 205M218 165L155 250M280 160H480L535 105M480 160L540 220"
            stroke="#936bb0"
            strokeWidth="7"
            fill="none"
          />
          <circle
            cx="245"
            cy="158"
            r="45"
            fill="#c6a5de"
            stroke="#805894"
            strokeWidth="3"
          />
          <circle cx="245" cy="158" r="15" fill="#795492" />
          <text x="65" y="35">
            Dendrites
          </text>
          <text x="214" y="235">
            Cell body
          </text>
          <text x="390" y="130">
            Axon
          </text>
        </>
      )}
    </svg>
  );
}
export default function TissueStudies() {
  const [index, setIndex] = useState(0);
  const tissue = tissues[index];
  return (
    <div className={s.atlas}>
      <header className={s.heading}>
        <div>
          <span>TISSUES & HISTOLOGY</span>
          <h1>Connect cells with structure.</h1>
          <p>Study the four tissue categories and their main subdivisions.</p>
        </div>
      </header>
      <div className={s.toolbar}>
        {tissues.map((item, i) => (
          <button
            key={item.id}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <section className={s.scope}>
        <h2>{tissue.name}</h2>
        <p>{tissue.summary}</p>
        <Diagram type={tissue.id} />
        <p className={s.small}>
          Original teaching schematic. This is not a histology slide and does
          not represent every subtype.
        </p>
        <div className={s.tissueGrid}>
          {tissue.types.map(([name, description]) => (
            <article key={name}>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <a href={base + tissue.source} target="_blank" rel="noreferrer">
          Read the tissue reference and examine textbook figures ↗
        </a>
      </section>
    </div>
  );
}
