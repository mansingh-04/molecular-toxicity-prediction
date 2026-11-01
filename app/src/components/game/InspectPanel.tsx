import { useGame } from '@/store/gameStore';
import { EQUIPMENT } from '@/data/equipment';
import { MoleculeView2D } from '@/components/compounds/MoleculeView2D';
import { Icon } from '@/components/ui/Icon';

export function InspectBody() {
  const target = useGame((s) => s.inspect);
  if (!target) return <p className="text-sm text-lab-300">Nothing to inspect.</p>;
  if (target.kind === 'equipment') return <EquipmentInspect id={target.equipmentId} />;
  return <VialInspect slotId={target.slotId} />;
}

function EquipmentInspect({ id }: { id: string }) {
  const info = EQUIPMENT[id];
  if (!info) return <p className="text-sm text-lab-300">Unknown equipment.</p>;
  return (
    <div className="space-y-3">
      <div className="text-xs text-lab-400">{info.zone}</div>
      <p className="text-sm text-lab-100">{info.description}</p>
      <p className="rounded-lg bg-white/[0.03] p-3 text-xs text-lab-300">{info.role}</p>
    </div>
  );
}

/** A vial on the shelf: what it contains, and the option to pick it up. */
function VialInspect({ slotId }: { slotId: string }) {
  const slot = useGame((s) => s.vialSlots().find((v) => v.id === slotId));
  const compound = useGame((s) => s.getCompound(slot?.compoundId));
  const heldName = useGame((s) => s.heldCompound()?.name);
  const pickUp = useGame((s) => s.pickUpVial);
  const close = useGame((s) => s.closePanel);
  const toast = useGame((s) => s.pushToast);
  if (!slot || !compound) return <p className="text-sm text-lab-300">Unknown vial.</p>;

  const take = () => {
    const r = pickUp(slot.id);
    if (!r.ok) return toast({ kind: 'warn', title: r.error });
    toast({ kind: 'success', title: `Picked up ${compound.name}`, body: 'Carry it to the Toxicity Analyzer (Analysis Suite, east).' });
    close();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Icon name="vial" className="h-4 w-4 text-accent-400" /><span className="mono text-sm text-white">Sample vial {slot.code}</span></div>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <MoleculeView2D smiles={compound.canonicalSmiles ?? compound.smiles} height={150} />
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-sm">
          <dt className="text-lab-400">Compound</dt><dd className="text-white">{compound.name}</dd>
          <dt className="text-lab-400">SMILES</dt><dd className="mono break-all text-xs text-lab-100">{compound.smiles}</dd>
          <dt className="text-lab-400">Formula</dt><dd className="mono text-lab-100">{compound.formula ?? '—'}</dd>
          <dt className="text-lab-400">Category</dt><dd className="text-lab-100">{compound.category}</dd>
        </dl>
      </div>
      {heldName && heldName !== compound.name && <p className="text-xs text-lab-400">You are holding {heldName}. Picking this one up puts it back on its shelf.</p>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={close}>Leave on shelf</button>
        <button className="btn-primary" autoFocus onClick={take}>Pick up</button>
      </div>
    </div>
  );
}
