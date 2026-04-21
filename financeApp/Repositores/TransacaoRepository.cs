using Microsoft.EntityFrameworkCore;
using financeApp.Data;
using financeApp.Models;

namespace financeApp.Repositories
{
    public class TransacaoRepository : ITransacaoRepository
    {
        private readonly AppDbContext _context;

        public TransacaoRepository(AppDbContext context)
        {
            _context = context;
        }

        public List<Transacao> Listar()
        {
            return _context.Transacoes
                .Include(t => t.Categoria)
                .ToList();
        }

        public Transacao? BuscarPorId(int id)
        {
            return _context.Transacoes
                .Include(t => t.Categoria)
                .FirstOrDefault(t => t.Id == id);
        }

        public void Adicionar(Transacao transacao)
        {
            // Validações de negócio
            if (transacao.Valor <= 0)
                throw new ArgumentException("O valor da transação deve ser maior que zero.");

            if (transacao.Data == default)
                throw new ArgumentException("A data da transação é obrigatória.");

            _context.Transacoes.Add(transacao);
            _context.SaveChanges();
        }

        public void Atualizar(Transacao transacao)
        {
            if (transacao.Valor <= 0)
                throw new ArgumentException("O valor da transação deve ser maior que zero.");

            _context.Transacoes.Update(transacao);
            _context.SaveChanges();
        }

        public void Deletar(int id)
        {
            var transacao = _context.Transacoes.Find(id);
            if (transacao == null)
                throw new KeyNotFoundException($"Transação com id {id} não encontrada.");

            _context.Transacoes.Remove(transacao);
            _context.SaveChanges();
        }

        public decimal ObterSaldo()
        {
            var transacoes = _context.Transacoes.ToList();

            var receitas = transacoes
                .Where(t => t.Tipo == TipoTransacao.Receita)
                .Sum(t => t.Valor);

            var despesas = transacoes
                .Where(t => t.Tipo == TipoTransacao.Despesa)
                .Sum(t => t.Valor);

            return receitas - despesas;
        }

        public List<Transacao> FiltrarPorTipo(TipoTransacao tipo)
        {
            return _context.Transacoes
                .Include(t => t.Categoria)
                .Where(t => t.Tipo == tipo)
                .ToList();
        }

        public Dictionary<string, decimal> TotalPorCategoria()
        {
            return _context.Transacoes
                .Include(t => t.Categoria)
                .Where(t => t.Tipo == TipoTransacao.Despesa && t.Categoria != null)
                .GroupBy(t => t.Categoria!.Nome)
                .ToDictionary(
                    grupo => grupo.Key,
                    grupo => grupo.Sum(t => t.Valor)
                );
        }
    }
}
