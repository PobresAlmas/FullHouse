import Image from "next/image";

export default function LoginSection() {
    return (
        <div className="text-center flex flex-col gap-3 max-w-md mx-auto">
            <Image
                src="/logo.png"
                alt="Logo"
                className="mx-auto rounded-2xl"
                width={80}
                height={80}
            />

            <h1 className="font-heading text-xl font-bold">FullHouse</h1>
            <p className="font-light text-sm">
                Organize a sua rotina e tarefas domésticas de maneiras rápida e prática
            </p>
        </div>
    );
}
