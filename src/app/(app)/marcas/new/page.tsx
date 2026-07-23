import { saveBrand } from "../actions";
import { BrandForm } from "../brand-form";

export default function NewBrandPage() {
  const action = saveBrand.bind(null, null);
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Nova marca</h1>
      <p className="mb-6 text-sm text-neutral-500">Cadastro de propriedade intelectual</p>
      <BrandForm action={action} />
    </div>
  );
}
