using financeApp.Data;
using financeApp.Models;

namespace financeApp.Repositories
{
    public class CategoriaRepository : ICategoriaRepository
    {
        private readonly AppDbContext _context;

        public CategoriaRepository(AppDbContext context)
        {
            _context = context;
        }

        public List<Categoria> Listar()
        {
            return _context.Categorias.ToList();
        }

        public Categoria? BuscarPorId(int id)
        {
            return _context.Categorias.Find(id);
        }

        public void Adicionar(Categoria categoria)
        {
            if (string.IsNullOrWhiteSpace(categoria.Nome))
                throw new ArgumentException("O nome da categoria é obrigatório.");

            _context.Categorias.Add(categoria);
            _context.SaveChanges();
        }

        public void Atualizar(Categoria categoria)
        {
            if (string.IsNullOrWhiteSpace(categoria.Nome))
                throw new ArgumentException("O nome da categoria é obrigatório.");

            _context.Categorias.Update(categoria);
            _context.SaveChanges();
        }

        public void Deletar(int id)
        {
            var categoria = _context.Categorias.Find(id);
            if (categoria == null)
                throw new KeyNotFoundException($"Categoria com id {id} não encontrada.");

            _context.Categorias.Remove(categoria);
            _context.SaveChanges();
        }
    }
}
